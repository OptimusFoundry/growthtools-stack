package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"base-server/internal/blog/processor"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// BlogProcessor defines the blog operations required by the handler.
type BlogProcessor interface {
	CreateBlogPost(ctx context.Context, params store.CreateBlogPostParams) (store.BlogPost, error)
	GetBlogPost(ctx context.Context, accountID, postID uuid.UUID) (processor.BlogPostWithMedia, error)
	ListBlogPosts(ctx context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPostListItem, error)
	UpdateBlogPost(ctx context.Context, accountID, postID uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error)
	DeleteBlogPost(ctx context.Context, accountID, postID uuid.UUID) error
	PublishBlogPost(ctx context.Context, accountID, postID uuid.UUID) (processor.BlogPublishResult, error)
	RetrySitePublish(ctx context.Context, accountID, postID uuid.UUID) (processor.BlogPublishResult, error)
	GenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID) (store.BlogPost, error)
	StreamGenerateBlogPost(ctx context.Context, accountID uuid.UUID, instruction string, keywords []string, mediaIDs []uuid.UUID, cb processor.BlogStreamCallbacks) error
}

type Handler struct {
	processor BlogProcessor
	logger    *observability.Logger
}

func New(processor BlogProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

type CreateBlogRequest struct {
	Title             string   `json:"title" binding:"required"`
	Slug              string   `json:"slug" binding:"required"`
	Content           string   `json:"content" binding:"required"`
	Excerpt           *string  `json:"excerpt"`
	SEOTitle          *string  `json:"seo_title"`
	MetaDescription   *string  `json:"meta_description"`
	Keywords          []string `json:"keywords"`
	OGTitle           *string  `json:"og_title"`
	OGDescription     *string  `json:"og_description"`
	FeaturedImageID   *string  `json:"featured_image_id"`
	SourceInstruction *string  `json:"source_instruction"`
	MediaIDs          []string `json:"media_ids"`
	PublishedAt       *string  `json:"published_at"`
}

type UpdateBlogRequest struct {
	Title             *string  `json:"title"`
	Slug              *string  `json:"slug"`
	Content           *string  `json:"content"`
	Excerpt           *string  `json:"excerpt"`
	SEOTitle          *string  `json:"seo_title"`
	MetaDescription   *string  `json:"meta_description"`
	Keywords          []string `json:"keywords"`
	OGTitle           *string  `json:"og_title"`
	OGDescription     *string  `json:"og_description"`
	FeaturedImageID   *string  `json:"featured_image_id"`
	SourceInstruction *string  `json:"source_instruction"`
	MediaIDs          []string `json:"media_ids"`
	PublishedAt       *string  `json:"published_at"`
}

// parsePublishedAt parses an optional "YYYY-MM-DD" date string (the shape an
// HTML date input sends) into a *time.Time. Used to let a post's published
// date be backdated or moved forward — nil in, nil out.
func parsePublishedAt(s *string) (*time.Time, error) {
	if s == nil || *s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil, fmt.Errorf("invalid published_at format, expected YYYY-MM-DD: %w", err)
	}
	return &t, nil
}

type GenerateBlogRequest struct {
	Instruction string   `json:"instruction" binding:"required"`
	Keywords    []string `json:"keywords"`
	MediaIDs    []string `json:"media_ids"`
}

func (h *Handler) HandleCreateBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req CreateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	publishedAt, err := parsePublishedAt(req.PublishedAt)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", err.Error())
		return
	}

	params := store.CreateBlogPostParams{
		AccountID:         accountID,
		Title:             req.Title,
		Slug:              req.Slug,
		Content:           req.Content,
		Excerpt:           req.Excerpt,
		Status:            "draft",
		SEOTitle:          req.SEOTitle,
		MetaDescription:   req.MetaDescription,
		Keywords:          store.StringArray(req.Keywords),
		OGTitle:           req.OGTitle,
		OGDescription:     req.OGDescription,
		SourceInstruction: req.SourceInstruction,
		MediaIDs:          store.UUIDArray{},
		PublishedAt:       publishedAt,
	}

	if req.FeaturedImageID != nil {
		id, err := uuid.Parse(*req.FeaturedImageID)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid featured_image_id format")
			return
		}
		params.FeaturedImageID = &id
	}

	for _, idStr := range req.MediaIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media_id format: "+idStr)
			return
		}
		params.MediaIDs = append(params.MediaIDs, id)
	}

	created, err := h.processor.CreateBlogPost(ctx, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *Handler) HandleGetBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	post, err := h.processor.GetBlogPost(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, post)
}

func (h *Handler) HandleListBlogs(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var statusFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}

	posts, err := h.processor.ListBlogPosts(ctx, accountID, statusFilter, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, posts)
}

func (h *Handler) HandleUpdateBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	var req UpdateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	publishedAt, err := parsePublishedAt(req.PublishedAt)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", err.Error())
		return
	}

	updateParams := store.UpdateBlogPostParams{
		Title:             req.Title,
		Slug:              req.Slug,
		Content:           req.Content,
		Excerpt:           req.Excerpt,
		SEOTitle:          req.SEOTitle,
		MetaDescription:   req.MetaDescription,
		OGTitle:           req.OGTitle,
		OGDescription:     req.OGDescription,
		SourceInstruction: req.SourceInstruction,
		PublishedAt:       publishedAt,
	}
	if req.Keywords != nil {
		updateParams.Keywords = store.StringArray(req.Keywords)
	}
	if req.FeaturedImageID != nil {
		id, err := uuid.Parse(*req.FeaturedImageID)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid featured_image_id format")
			return
		}
		updateParams.FeaturedImageID = &id
	}
	if req.MediaIDs != nil {
		for _, idStr := range req.MediaIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media_id format: "+idStr)
				return
			}
			updateParams.MediaIDs = append(updateParams.MediaIDs, id)
		}
	}

	updated, err := h.processor.UpdateBlogPost(ctx, accountID, postID, updateParams)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) HandleDeleteBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	if err := h.processor.DeleteBlogPost(ctx, accountID, postID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog post deleted successfully"})
}

func (h *Handler) HandlePublishBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	published, err := h.processor.PublishBlogPost(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, published)
}

func (h *Handler) HandleRetrySitePublish(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid blog post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	result, err := h.processor.RetrySitePublish(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) HandleGenerateBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req GenerateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	mediaIDs := make([]uuid.UUID, 0, len(req.MediaIDs))
	for _, idStr := range req.MediaIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media_id format: "+idStr)
			return
		}
		mediaIDs = append(mediaIDs, id)
	}

	post, err := h.processor.GenerateBlogPost(ctx, accountID, req.Instruction, req.Keywords, mediaIDs)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, post)
}

// HandleStreamGenerateBlog streams blog post generation via SSE.
// Events emitted:
//   - event: phase  data: {"phase":"generating"}
//   - event: chunk  data: {"text":"...markdown delta..."}
//   - event: done   data: {<full store.BlogPost JSON>}
//   - event: error  data: "human-readable error message"
//
// The blog post is persisted atomically when the full AI response is validated.
// The non-streaming /blog/generate endpoint is kept for backwards compatibility.
func (h *Handler) HandleStreamGenerateBlog(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req GenerateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	mediaIDs := make([]uuid.UUID, 0, len(req.MediaIDs))
	for _, idStr := range req.MediaIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media_id format: "+idStr)
			return
		}
		mediaIDs = append(mediaIDs, id)
	}

	// Set SSE headers.
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher, canFlush := c.Writer.(http.Flusher)

	var mu sync.Mutex
	writeSSE := func(event, data string) {
		mu.Lock()
		defer mu.Unlock()
		fmt.Fprintf(c.Writer, "event: %s\n", event)
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		if canFlush {
			flusher.Flush()
		}
	}

	mustMarshal := func(v any) string {
		b, err := json.Marshal(v)
		if err != nil {
			return "{}"
		}
		return string(b)
	}

	cb := processor.BlogStreamCallbacks{
		OnPhase: func(phase string) {
			writeSSE("phase", mustMarshal(map[string]string{"phase": phase}))
		},
		OnChunk: func(chunk string) {
			writeSSE("chunk", mustMarshal(map[string]string{"text": chunk}))
		},
		OnDone: func(post store.BlogPost) {
			writeSSE("done", mustMarshal(post))
		},
		OnError: func(err error) {
			h.logger.Error(ctx, "blog stream generation error", err)
			writeSSE("error", "blog generation failed")
		},
	}

	if err := h.processor.StreamGenerateBlogPost(ctx, accountID, req.Instruction, parseKeywords(req.Keywords), mediaIDs, cb); err != nil {
		// OnError already wrote the SSE error event; nothing else to do.
		return
	}
}

// parseKeywords normalises a raw keyword slice: trims whitespace and drops empties.
func parseKeywords(raw []string) []string {
	out := make([]string, 0, len(raw))
	for _, k := range raw {
		k = strings.TrimSpace(k)
		if k != "" {
			out = append(out, k)
		}
	}
	return out
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrBlogPostNotFound):
		apierrors.NotFound(c, "Blog post not found")
	case errors.Is(err, processor.ErrSlugAlreadyExists):
		apierrors.Conflict(c, "SLUG_EXISTS", "A blog post with this slug already exists")
	case errors.Is(err, processor.ErrBlogGenerationFailed):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrBlogPostNotPublished):
		apierrors.Conflict(c, "BLOG_NOT_PUBLISHED", "Blog post is not published yet")
	default:
		apierrors.InternalError(c, err)
	}
}

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
