package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxImages       = 4
	maxImageSize    = 10 * 1024 * 1024 // 10MB
	maxTotalPayload = 45 * 1024 * 1024 // 45MB total
)

// Describer defines the media description operations required by the handler.
type Describer interface {
	DescribeBatch(ctx context.Context, items []mediadescriber.Media) []mediadescriber.Description
}

// Generator defines the social post generation operations required by the handler.
type Generator interface {
	GenerateStream(ctx context.Context, req socialposts.Request) (<-chan socialposts.Event, error)
}

// S3Fetcher defines the S3 operations required by the handler for media-aware generation.
type S3Fetcher interface {
	GetFile(ctx context.Context, key string) (io.ReadCloser, string, error)
}

// HandlerStore defines the database operations required by the handler.
type HandlerStore interface {
	GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
	GetMediaByIDs(ctx context.Context, ids []uuid.UUID) ([]store.Media, error)
}

// Handler handles HTTP requests for content generation.
type Handler struct {
	describer Describer
	generator Generator
	store     HandlerStore
	s3Fetch   S3Fetcher
	logger    *observability.Logger
}

// New creates a new content Handler.
func New(
	describer Describer,
	generator Generator,
	store HandlerStore,
	s3Fetch S3Fetcher,
	logger *observability.Logger,
) Handler {
	return Handler{
		describer: describer,
		generator: generator,
		store:     store,
		s3Fetch:   s3Fetch,
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
//   - MediaIDs non-empty → fetch from S3, describe media, call socialposts.GenerateStream
//   - Images non-empty (and MediaIDs empty) → decode base64, describe media, call socialposts.GenerateStream
//   - Both empty → text-only socialposts.GenerateStream
//   - Both supplied → prefer MediaIDs, log warning, ignore Images
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

	// Fetch media and descriptions.
	descriptions := make([]mediadescriber.Description, 0)
	if len(req.MediaIDs) > 0 {
		h.handleStreamGenerateWithMediaIDs(ctx, c, accountID, req, mode, writeSSE)
		return
	}

	// Decode base64 images or use empty list.
	images, err := decodeImages(req.Images)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_IMAGES", err.Error())
		return
	}

	// Describe images if any.
	if len(images) > 0 {
		writeSSE("phase", mustMarshal(map[string]string{"phase": "describing", "platform": ""}))
		mediaItems := make([]mediadescriber.Media, len(images))
		for i, img := range images {
			mediaItems[i] = mediadescriber.Media{
				Index:    i + 1,
				Kind:     mediadescriber.KindImage,
				MIMEType: img.MIMEType,
				Data:     img.Data,
			}
		}
		descriptions = h.describer.DescribeBatch(ctx, mediaItems)
	}

	// Get voice profile.
	voiceCtx, err := h.getVoiceContext(ctx, accountID)
	if err != nil {
		h.logger.Error(ctx, "failed to fetch voice profile", err)
		// Continue without voice profile; it's optional.
	}

	// Build socialposts.Request.
	genReq := socialposts.Request{
		Prompt:      req.Prompt,
		Platforms:   req.Platforms,
		Mode:        mode,
		Media:       descriptions,
		Voice:       voiceCtx,
	}

	if mode == socialposts.ModeThread {
		genReq.ThreadParts = req.MaxThreadParts
		if genReq.ThreadParts < 2 {
			genReq.ThreadParts = 3
		}
		if genReq.ThreadParts > 3 {
			genReq.ThreadParts = 3
		}
	}

	// Stream generation.
	ch, err := h.generator.GenerateStream(ctx, genReq)
	if err != nil {
		h.logger.Error(ctx, "failed to start stream generation", err)
		writeSSE("error", "failed to start content generation")
		return
	}

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
				payload, _ := json.Marshal(map[string]any{"platform": result.PlatformName, "segments": result.Segments})
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

	donePayload, _ := json.Marshal(map[string]any{"platforms": platformResults, "threads": threadResults})
	writeSSE("done", string(donePayload))
}

// handleStreamGenerateWithMediaIDs handles the media-ID path: fetch from S3, describe, generate.
func (h *Handler) handleStreamGenerateWithMediaIDs(
	ctx context.Context,
	c *gin.Context,
	accountID uuid.UUID,
	req StreamGenerateRequest,
	mode socialposts.Mode,
	writeSSE func(event, data string),
) {
	// Parse media IDs.
	mediaIDs := make([]uuid.UUID, 0, len(req.MediaIDs))
	for _, rawID := range req.MediaIDs {
		id, err := uuid.Parse(rawID)
		if err != nil {
			h.logger.Warn(ctx, "skipping invalid media_id in stream generate: "+rawID)
			continue
		}
		mediaIDs = append(mediaIDs, id)
	}
	if len(mediaIDs) == 0 {
		writeSSE("error", "no valid media_ids provided")
		return
	}

	// Fetch media rows from database.
	rows, err := h.store.GetMediaByIDs(ctx, mediaIDs)
	if err != nil {
		h.logger.Error(ctx, "failed to load media rows", err)
		writeSSE("error", "failed to fetch media for generation")
		return
	}

	// Build a map for quick lookup.
	rowByID := make(map[uuid.UUID]store.Media, len(rows))
	for _, r := range rows {
		rowByID[r.ID] = r
	}

	// Fetch S3 bytes for each media item.
	writeSSE("phase", mustMarshal(map[string]string{"phase": "describing", "platform": ""}))

	mediaItems := make([]mediadescriber.Media, 0, len(mediaIDs))
	imageDataList := make([]aiclient.ImageData, 0)

	for i, id := range mediaIDs {
		row, ok := rowByID[id]
		if !ok || row.AccountID != accountID {
			continue
		}
		if row.S3Key == "" {
			continue
		}

		// Fetch from S3.
		body, mimeType, fetchErr := h.s3Fetch.GetFile(ctx, row.S3Key)
		if fetchErr != nil {
			h.logger.Error(ctx, "failed to fetch media from S3", fetchErr)
			continue
		}
		defer body.Close()

		// Read bytes.
		data, readErr := io.ReadAll(body)
		if readErr != nil {
			h.logger.Error(ctx, "failed to read media bytes from S3", readErr)
			continue
		}

		// Determine kind from MIME type.
		var kind mediadescriber.Kind
		if strings.HasPrefix(mimeType, "video/") {
			kind = mediadescriber.KindVideo
		} else {
			kind = mediadescriber.KindImage
		}

		mediaItems = append(mediaItems, mediadescriber.Media{
			Index:    i + 1,
			Kind:     kind,
			MIMEType: mimeType,
			Data:     data,
		})
		imageDataList = append(imageDataList, aiclient.ImageData{
			MIMEType: mimeType,
			Data:     data,
		})
	}

	if len(mediaItems) == 0 {
		writeSSE("error", "no valid media found")
		return
	}

	// Describe media.
	descriptions := h.describer.DescribeBatch(ctx, mediaItems)

	// Get voice profile.
	voiceCtx, err := h.getVoiceContext(ctx, accountID)
	if err != nil {
		h.logger.Error(ctx, "failed to fetch voice profile", err)
		// Continue without voice profile; it's optional.
	}

	// Build socialposts.Request.
	genReq := socialposts.Request{
		Prompt:    req.Prompt,
		Platforms: req.Platforms,
		Mode:      mode,
		Media:     descriptions,
		Voice:     voiceCtx,
	}

	if mode == socialposts.ModeThread {
		genReq.ThreadParts = req.MaxThreadParts
		if genReq.ThreadParts < 2 {
			genReq.ThreadParts = 3
		}
		if genReq.ThreadParts > 3 {
			genReq.ThreadParts = 3
		}
	}

	// Stream generation.
	ch, err := h.generator.GenerateStream(ctx, genReq)
	if err != nil {
		h.logger.Error(ctx, "failed to start stream generation", err)
		writeSSE("error", "failed to start content generation")
		return
	}

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
				payload, _ := json.Marshal(map[string]any{"platform": result.PlatformName, "segments": result.Segments})
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

	donePayload, _ := json.Marshal(map[string]any{"platforms": platformResults, "threads": threadResults})
	writeSSE("done", string(donePayload))
}

// getVoiceContext fetches the voice profile for an account and converts it to socialposts.VoiceContext.
func (h *Handler) getVoiceContext(ctx context.Context, accountID uuid.UUID) (*socialposts.VoiceContext, error) {
	vp, err := h.store.GetVoiceProfileByAccount(ctx, accountID)
	if err != nil {
		return nil, err
	}

	vc := &socialposts.VoiceContext{
		Tone:         vp.Tone,
		Style:        vp.Style,
		ExamplePosts: vp.ExamplePosts,
	}
	if vp.Industry != nil {
		vc.Industry = *vp.Industry
	}
	if vp.TargetAudience != nil {
		vc.TargetAudience = *vp.TargetAudience
	}
	if vp.CustomInstructions != nil {
		vc.CustomInstructions = *vp.CustomInstructions
	}
	return vc, nil
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
