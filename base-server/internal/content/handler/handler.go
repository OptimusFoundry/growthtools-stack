package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"

	"base-server/internal/content/processor"
	"base-server/internal/content/prompts"
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

// ContentProcessor defines the content generation operations required by the handler.
type ContentProcessor interface {
	GeneratePost(ctx context.Context, accountID uuid.UUID, prompt string, platforms []string) (string, error)
	AdaptContent(ctx context.Context, accountID uuid.UUID, content string, platform string) (string, error)
	GenerateThread(ctx context.Context, content string, platform string) ([]string, error)
	StreamGenerateAndAdapt(ctx context.Context, accountID uuid.UUID, prompt string, platforms []string, contentType string, images []aiclient.ImageData, maxThreadParts int, cb processor.StreamCallbacks) error
	// Media-aware regenerate path (trust-user-selection).
	FetchAndBucketMedia(ctx context.Context, accountID uuid.UUID, mediaIDs []uuid.UUID) (video *aiclient.ImageData, images []aiclient.ImageData, videoPresent bool, err error)
	DecideMode(ctx context.Context, video *aiclient.ImageData, images []aiclient.ImageData, prompt string) (processor.ModeDecision, error)
	GenerateWithMediaPlan(ctx context.Context, accountID uuid.UUID, prompt string, platforms []string, plan *prompts.MediaPlan) (string, map[string]processor.ThreadWithMediaPlanResult, error)
}

// Handler handles HTTP requests for content generation.
type Handler struct {
	processor ContentProcessor
	logger    *observability.Logger
}

// New creates a new content Handler.
func New(proc ContentProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: proc,
		logger:    logger,
	}
}

// GeneratePostRequest is the request body for post generation.
type GeneratePostRequest struct {
	Prompt    string   `json:"prompt" binding:"required"`
	Platforms []string `json:"platforms"`
}

// AdaptContentRequest is the request body for content adaptation.
type AdaptContentRequest struct {
	Content  string `json:"content" binding:"required"`
	Platform string `json:"platform" binding:"required"`
}

// GenerateThreadRequest is the request body for thread generation.
type GenerateThreadRequest struct {
	Content  string `json:"content" binding:"required"`
	Platform string `json:"platform" binding:"required"`
}

// ImageInput represents a base64-encoded image in the request body.
type ImageInput struct {
	MIMEType string `json:"mime_type" binding:"required"`
	Data     string `json:"data" binding:"required"`
}

// StreamGenerateRequest is the request body for streaming content generation.
//
// When MediaIDs is non-empty the handler uses the media-aware regenerate path:
// it fetches the persisted media rows, downloads their S3 bytes, decides
// single-vs-thread, and calls GenerateWithMediaPlan.  When only Images is
// non-empty it falls through to the original StreamGenerateAndAdapt path.
// Callers must NOT send both; if both arrive MediaIDs is preferred and a
// warning is logged.
type StreamGenerateRequest struct {
	Prompt         string       `json:"prompt" binding:"required"`
	Platforms      []string     `json:"platforms" binding:"required,min=1"`
	ContentType    string       `json:"content_type"`
	Images         []ImageInput `json:"images"`
	MediaIDs       []string     `json:"media_ids"`
	MaxThreadParts int          `json:"max_thread_parts,omitempty"`
}

// HandleGeneratePost generates a social media post from a prompt.
func (h *Handler) HandleGeneratePost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req GeneratePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	content, err := h.processor.GeneratePost(ctx, accountID, req.Prompt, req.Platforms)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": content})
}

// HandleAdaptContent adapts existing content for a specific platform.
func (h *Handler) HandleAdaptContent(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req AdaptContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	adapted, err := h.processor.AdaptContent(ctx, accountID, req.Content, req.Platform)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": adapted})
}

// HandleGenerateThread generates a thread of posts from content.
func (h *Handler) HandleGenerateThread(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req GenerateThreadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	thread, err := h.processor.GenerateThread(ctx, req.Content, req.Platform)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"thread": thread})
}

// HandleStreamGenerate streams content generation and per-platform adaptation via SSE.
// Base content is streamed first, then parallel per-platform adaptations stream concurrently.
//
// Path selection:
//   - MediaIDs non-empty → media-aware regenerate path (trust user's selection,
//     fetch from S3, decide mode, call GenerateWithMediaPlan). This is
//     non-streaming internally (GenerateWithMediaPlan is synchronous); events are
//     emitted in batch at the end. Acceptable for v1 regenerate UX.
//   - Images non-empty (and MediaIDs empty) → original StreamGenerateAndAdapt path.
//   - Both empty → text-only StreamGenerateAndAdapt path.
//   - Both supplied → prefer MediaIDs, log warning, ignore Images.
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

	// Mutex protects concurrent SSE writes from parallel platform goroutines.
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

	if len(req.MediaIDs) > 0 {
		h.handleStreamGenerateWithMedia(ctx, c, accountID, req, writeSSE)
		return
	}

	// --- Original path: base64 images or text-only ---

	// Decode base64 images.
	images, err := decodeImages(req.Images)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_IMAGES", err.Error())
		return
	}

	contentType := req.ContentType
	if contentType == "" {
		contentType = "text"
	}

	platformResults := make(map[string]string)
	threadResults := make(map[string][]processor.ThreadSegment)
	var resultsMu sync.Mutex

	callbacks := processor.StreamCallbacks{
		OnPhase: func(phase string, platform string) {
			payload, _ := json.Marshal(map[string]string{"phase": phase, "platform": platform})
			writeSSE("phase", string(payload))
		},
		OnChunk: func(platform string, chunk string) {
			payload, _ := json.Marshal(map[string]string{"platform": platform, "text": chunk})
			writeSSE("chunk", string(payload))
		},
		OnBaseDone: func(content string) {
			payload, _ := json.Marshal(map[string]string{"content": content})
			writeSSE("base_done", string(payload))
		},
		OnPlatformDone: func(platform string, content string) {
			resultsMu.Lock()
			platformResults[platform] = content
			resultsMu.Unlock()
			payload, _ := json.Marshal(map[string]string{"platform": platform, "content": content})
			writeSSE("platform_done", string(payload))
		},
		OnThreadDone: func(platform string, segments []processor.ThreadSegment) {
			resultsMu.Lock()
			threadResults[platform] = segments
			resultsMu.Unlock()
			payload, _ := json.Marshal(map[string]any{"platform": platform, "segments": segments})
			writeSSE("thread_done", string(payload))
		},
	}

	if err := h.processor.StreamGenerateAndAdapt(ctx, accountID, req.Prompt, req.Platforms, contentType, images, req.MaxThreadParts, callbacks); err != nil {
		h.logger.Error(ctx, "streaming content generation failed", err)
		writeSSE("error", "failed to generate content")
		return
	}

	donePayload, _ := json.Marshal(map[string]any{"platforms": platformResults, "threads": threadResults})
	writeSSE("done", string(donePayload))
}

// handleStreamGenerateWithMedia is the media-aware regenerate path.
// It trusts the user's media selection: fetch from S3, decide mode via AI,
// then call GenerateWithMediaPlan.
//
// NOTE: GenerateWithMediaPlan is synchronous, so all events are emitted in
// batch at the end (no true streaming for the base content phase). This is an
// accepted v1 regression relative to the SSE path — the trade-off is
// simplicity and correctness.
func (h *Handler) handleStreamGenerateWithMedia(
	ctx context.Context,
	c *gin.Context,
	accountID uuid.UUID,
	req StreamGenerateRequest,
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

	writeSSE("phase", mustMarshal(map[string]string{"phase": "generating", "platform": ""}))

	// Fetch and bucket media by MIME type.
	video, images, _, err := h.processor.FetchAndBucketMedia(ctx, accountID, mediaIDs)
	if err != nil {
		h.logger.Error(ctx, "failed to fetch media for regenerate", err)
		writeSSE("error", "failed to fetch media for generation")
		return
	}

	// Ask the AI to decide single vs thread. Fail-open to thread mode.
	modeDecision, err := h.processor.DecideMode(ctx, video, images, req.Prompt)
	if err != nil {
		h.logger.Error(ctx, "mode decision failed; defaulting to thread mode", err)
		modeDecision = processor.ModeDecision{Mode: "thread", ThreadParts: 5, Reason: "mode decision unavailable"}
	}

	// Build a MediaPlan that reflects the full user selection.
	// VideoIndex = 1 if video present, ImageIndexes = [2..N] or [1..N].
	plan := buildMediaPlanFromBucketed(video != nil, len(images))
	plan.Mode = modeDecision.Mode
	plan.ThreadParts = modeDecision.ThreadParts

	baseContent, perPlatform, err := h.processor.GenerateWithMediaPlan(ctx, accountID, req.Prompt, req.Platforms, plan)
	if err != nil {
		h.logger.Error(ctx, "media-aware content generation failed", err)
		writeSSE("error", "failed to generate content")
		return
	}

	// Emit events (batch — no true SSE streaming for base content in this path).
	writeSSE("base_done", mustMarshal(map[string]string{"content": baseContent}))

	platformResults := make(map[string]string, len(perPlatform))
	threadResults := make(map[string][]processor.ThreadSegment)

	for _, platform := range req.Platforms {
		result, ok := perPlatform[platform]
		if !ok {
			continue
		}
		platformResults[platform] = result.Content
		writeSSE("platform_done", mustMarshal(map[string]string{"platform": platform, "content": result.Content}))

		if modeDecision.Mode == "thread" && len(result.Segments) > 0 {
			segs := assignMediaIndexesToSegments(result.Segments, plan)
			threadResults[platform] = segs
			writeSSE("thread_done", mustMarshal(map[string]any{"platform": platform, "segments": segs}))
		}
	}

	donePayload, _ := json.Marshal(map[string]any{"platforms": platformResults, "threads": threadResults})
	writeSSE("done", string(donePayload))
}

// buildMediaPlanFromBucketed builds a MediaPlan reflecting a user's full
// selection (video + N images). Callers set Mode and ThreadParts separately.
func buildMediaPlanFromBucketed(hasVideo bool, imageCount int) *prompts.MediaPlan {
	plan := &prompts.MediaPlan{}
	next := 1
	if hasVideo {
		plan.VideoIndex = next
		next++
	}
	for i := 0; i < imageCount; i++ {
		plan.ImageIndexes = append(plan.ImageIndexes, next)
		next++
	}
	return plan
}

// assignMediaIndexesToSegments assigns 1-based media indexes to thread
// segments in order: segment 0 gets the first media item, etc.
func assignMediaIndexesToSegments(segs []processor.ThreadSegment, plan *prompts.MediaPlan) []processor.ThreadSegment {
	out := make([]processor.ThreadSegment, len(segs))
	// Build the ordered 1-based index list from the plan.
	mediaOrder := make([]int, 0, 1+len(plan.ImageIndexes))
	if plan.VideoIndex > 0 {
		mediaOrder = append(mediaOrder, 1)
	}
	for i := range plan.ImageIndexes {
		pos := i
		if plan.VideoIndex > 0 {
			pos = i + 1
		}
		mediaOrder = append(mediaOrder, pos+1)
	}
	for i, seg := range segs {
		out[i] = seg
		if i < len(mediaOrder) {
			idx := mediaOrder[i]
			out[i].ImageIndex = &idx
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

// handleError maps processor errors to appropriate API responses.
func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrGeneratePost):
		apierrors.ServiceUnavailable(c, "GENERATION_FAILED", "Failed to generate post content", err)
	case errors.Is(err, processor.ErrAdaptContent):
		apierrors.ServiceUnavailable(c, "ADAPT_FAILED", "Failed to adapt content", err)
	case errors.Is(err, processor.ErrGenerateThread):
		apierrors.ServiceUnavailable(c, "THREAD_FAILED", "Failed to generate thread", err)
	case errors.Is(err, processor.ErrVoiceProfile):
		apierrors.InternalError(c, err)
	default:
		apierrors.InternalError(c, err)
	}
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
