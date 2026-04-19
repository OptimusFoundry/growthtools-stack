package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"base-server/internal/ai/socialposts"
	contentProcessor "base-server/internal/content/processor"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxImages       = 4
	maxImageSize    = 10 * 1024 * 1024 // 10MB
	maxTotalPayload = 45 * 1024 * 1024 // 45MB total
)

// ContentProcessor defines the processor surface the handler depends on.
// Matches the interface-based DI pattern used by every other feature handler.
type ContentProcessor interface {
	StreamGenerate(ctx context.Context, params contentProcessor.StreamGenerateParams) (<-chan socialposts.Event, error)
}

// Handler handles HTTP requests for content generation.
type Handler struct {
	processor ContentProcessor
	logger    *observability.Logger
}

// New creates a new content Handler.
func New(processor ContentProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

// ImageInput represents a base64-encoded image in the request body.
type ImageInput struct {
	MIMEType string `json:"mime_type" binding:"required"`
	Data     string `json:"data" binding:"required"`
}

// StreamGenerateRequest is the request body for streaming content generation.
type StreamGenerateRequest struct {
	Prompt         string       `json:"prompt" binding:"required"`
	Platforms      []string     `json:"platforms" binding:"required,min=1"`
	ContentType    string       `json:"content_type"`
	Images         []ImageInput `json:"images"`
	MediaIDs       []string     `json:"media_ids"`
	MaxThreadParts int          `json:"max_thread_parts,omitempty"`
}

// HandleStreamGenerate streams content generation and per-platform adaptation via SSE.
// It supports both base64-encoded images and media IDs that reference stored media in S3.
//
// Path selection:
//   - MediaIDs non-empty → processor fetches from S3, describes media, calls socialposts.GenerateStream
//   - Images non-empty (and MediaIDs empty) → decode base64, processor describes, calls socialposts.GenerateStream
//   - Both empty → processor calls text-only socialposts.GenerateStream
//   - Both supplied → processor prefers MediaIDs, logs warning, ignores Images
//
// content_type must be one of: "single", "text", or "thread" (case-insensitive).
// Returns 400 if content_type is missing or invalid.
func (h *Handler) HandleStreamGenerate(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req StreamGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	// Validate content_type.
	contentTypeNorm := strings.ToLower(strings.TrimSpace(req.ContentType))
	switch contentTypeNorm {
	case "single", "text", "thread":
		// valid
	default:
		apierrors.BadRequest(c, "INVALID_CONTENT_TYPE", "content_type must be one of: single, thread, text")
		return
	}

	// Resolve mode for socialposts.Request.
	var mode socialposts.Mode
	switch contentTypeNorm {
	case "thread":
		mode = socialposts.ModeThread
	default:
		// both "single" and "text" map to ModeSingle
		mode = socialposts.ModeSingle
	}

	// Guard: both paths supplied — prefer MediaIDs.
	if len(req.MediaIDs) > 0 && len(req.Images) > 0 {
		h.logger.Warn(ctx, "stream generate received both media_ids and images; preferring media_ids")
	}

	// Decode base64 images if provided.
	decodedImages, err := decodeImages(req.Images)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_IMAGES", err.Error())
		return
	}

	// Parse media IDs.
	mediaIDs := make([]uuid.UUID, 0, len(req.MediaIDs))
	for _, rawID := range req.MediaIDs {
		id, parseErr := uuid.Parse(rawID)
		if parseErr != nil {
			h.logger.Warn(ctx, "skipping invalid media_id in stream generate: "+rawID)
			continue
		}
		mediaIDs = append(mediaIDs, id)
	}

	// Build processor request.
	procParams := contentProcessor.StreamGenerateParams{
		AccountID:   accountID,
		Prompt:      req.Prompt,
		Platforms:   req.Platforms,
		Mode:        mode,
		ThreadParts: req.MaxThreadParts,
		Images:      decodedImages,
		MediaIDs:    mediaIDs,
	}

	// Call processor to start the pipeline.
	ch, err := h.processor.StreamGenerate(ctx, procParams)
	if err != nil {
		h.logger.Error(ctx, "failed to start stream generation", err)
		apierrors.BadRequest(c, "GENERATION_FAILED", "failed to start content generation")
		return
	}

	// Set SSE headers before writing anything.
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher, canFlush := c.Writer.(http.Flusher)

	// Mutex protects concurrent SSE writes.
	var mu sync.Mutex
	writeSSE := func(event string, data string) {
		mu.Lock()
		defer mu.Unlock()
		if event != "" {
			fmt.Fprintf(c.Writer, "event: %s\n", event)
		}
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		if canFlush {
			flusher.Flush()
		}
	}

	// Send describing phase event.
	if len(mediaIDs) > 0 || len(decodedImages) > 0 {
		writeSSE("phase", mustMarshal(map[string]string{"phase": "describing", "platform": ""}))
	}

	// Relay events from processor to client as SSE.
	platformResults := make(map[string]string)
	threadResults := make(map[string][]socialposts.Segment)
	var resultsMu sync.Mutex

	for evt := range ch {
		switch e := evt.(type) {
		case socialposts.PhaseEvent:
			payload, _ := json.Marshal(map[string]string{"phase": e.Phase, "platform": e.Platform})
			writeSSE("phase", string(payload))
		case socialposts.ChunkEvent:
			payload, _ := json.Marshal(map[string]string{"platform": e.Platform, "text": e.Chunk})
			writeSSE("chunk", string(payload))
		case socialposts.BaseDoneEvent:
			payload, _ := json.Marshal(map[string]string{"content": e.Content})
			writeSSE("base_done", string(payload))
		case socialposts.PlatformDoneEvent:
			resultsMu.Lock()
			switch result := e.Result.(type) {
			case socialposts.SinglePost:
				platformResults[result.PlatformName] = result.Content
				resultsMu.Unlock()
				payload, _ := json.Marshal(map[string]string{"platform": result.PlatformName, "content": result.Content})
				writeSSE("platform_done", string(payload))
			case socialposts.Thread:
				platformResults[result.PlatformName] = "(thread)"
				threadResults[result.PlatformName] = result.Segments
				resultsMu.Unlock()
				payload, _ := json.Marshal(map[string]any{"platform": result.PlatformName, "segments": segmentsToJSON(result.Segments)})
				writeSSE("platform_done", string(payload))
				writeSSE("thread_done", string(payload))
			default:
				resultsMu.Unlock()
			}
		case socialposts.ErrorEvent:
			h.logger.Error(ctx, "stream generation error event", e.Err)
			writeSSE("error", "failed to generate content")
			return
		}
	}

	threadsOut := make(map[string]any, len(threadResults))
	for platform, segs := range threadResults {
		threadsOut[platform] = segmentsToJSON(segs)
	}
	donePayload, _ := json.Marshal(map[string]any{"platforms": platformResults, "threads": threadsOut})
	writeSSE("done", string(donePayload))
}

// segmentsToJSON normalizes socialposts.Segment values into the snake_case
// shape the webapp expects: {content, image_index?}.
func segmentsToJSON(segs []socialposts.Segment) []map[string]any {
	out := make([]map[string]any, 0, len(segs))
	for _, s := range segs {
		switch v := s.(type) {
		case socialposts.TextSegment:
			out = append(out, map[string]any{"content": v.Content})
		case socialposts.MediaSegment:
			out = append(out, map[string]any{"content": v.Content, "image_index": v.ImageIndex})
		}
	}
	return out
}


// mustMarshal marshals v to JSON, returning an empty object string on error.
func mustMarshal(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// decodeImages validates and decodes base64 image inputs.
func decodeImages(inputs []ImageInput) ([]aiclient.ImageData, error) {
	if len(inputs) == 0 {
		return nil, nil
	}
	if len(inputs) > maxImages {
		return nil, fmt.Errorf("maximum %d images allowed", maxImages)
	}

	images := make([]aiclient.ImageData, 0, len(inputs))
	for i, input := range inputs {
		data, err := base64.StdEncoding.DecodeString(input.Data)
		if err != nil {
			return nil, fmt.Errorf("invalid base64 data for image %d", i+1)
		}
		if len(data) > maxImageSize {
			return nil, fmt.Errorf("image %d exceeds maximum size of 10MB", i+1)
		}
		images = append(images, aiclient.ImageData{
			MIMEType: input.MIMEType,
			Data:     data,
		})
	}
	return images, nil
}

// getAccountID extracts and validates the account ID from the gin context.
func (h *Handler) getAccountID(c *gin.Context) (uuid.UUID, bool) {
	accountIDStr, exists := c.Get("Account-ID")
	if !exists {
		apierrors.Unauthorized(c, "Account ID not found in context")
		return uuid.UUID{}, false
	}
	accountID, err := uuid.Parse(accountIDStr.(string))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid account ID format")
		return uuid.UUID{}, false
	}
	return accountID, true
}
