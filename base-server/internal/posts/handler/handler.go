package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/posts/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PostProcessor defines the post operations required by the handler.
type PostProcessor interface {
	CreatePost(ctx context.Context, params store.CreatePostParams) (store.Post, error)
	GetPost(ctx context.Context, accountID, postID uuid.UUID) (store.Post, error)
	ListPosts(ctx context.Context, params store.ListPostsParams) ([]store.Post, error)
	UpdatePost(ctx context.Context, accountID, postID uuid.UUID, params store.UpdatePostParams) (store.Post, error)
	DeletePost(ctx context.Context, accountID, postID uuid.UUID) error
	UnlinkMedia(ctx context.Context, accountID, postID, mediaID uuid.UUID) error
	PublishPost(ctx context.Context, accountID, postID uuid.UUID, platforms []string) error
	SchedulePost(ctx context.Context, accountID, postID uuid.UUID, scheduledAt time.Time) (store.Post, error)
	SaveDraft(ctx context.Context, params processor.SaveDraftParams) (store.Post, error)
	GetPostWithPlatformPosts(ctx context.Context, accountID, postID uuid.UUID) (processor.PostWithPlatformPosts, error)
	UpdateDraft(ctx context.Context, params processor.UpdateDraftParams) (store.Post, error)
	RetryFailedPlatformPosts(ctx context.Context, accountID, postID uuid.UUID) error
}

type Handler struct {
	processor PostProcessor
	logger    *observability.Logger
}

func New(processor PostProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

type CreatePostRequest struct {
	Title       *string  `json:"title"`
	Content     string   `json:"content" binding:"required"`
	ContentType string   `json:"content_type" binding:"required"`
	Tags        []string `json:"tags"`
	MediaIDs    []string `json:"media_ids"`
}

type UpdatePostRequest struct {
	Title       *string  `json:"title"`
	Content     *string  `json:"content"`
	ContentType *string  `json:"content_type"`
	Tags        []string `json:"tags"`
}

type PublishPostRequest struct {
	Platforms []string `json:"platforms" binding:"required"`
}

type SchedulePostRequest struct {
	ScheduledAt string `json:"scheduled_at" binding:"required"`
}

type PlatformContentInput struct {
	Platform       string           `json:"platform" binding:"required"`
	Content        *string          `json:"content"`
	ThreadSegments *json.RawMessage `json:"thread_segments"`
}

type SaveDraftRequest struct {
	Content     string                 `json:"content" binding:"required"`
	ContentType string                 `json:"content_type" binding:"required"`
	Tags        []string               `json:"tags"`
	MediaIDs    []string               `json:"media_ids"`
	AIGenerated bool                   `json:"ai_generated"`
	BaseContent *string                `json:"base_content"`
	Platforms   []PlatformContentInput `json:"platforms" binding:"required"`
}

func (h *Handler) HandleCreatePost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	mediaIDs := make(store.UUIDArray, 0, len(req.MediaIDs))
	for _, idStr := range req.MediaIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media ID format")
			return
		}
		mediaIDs = append(mediaIDs, id)
	}

	params := store.CreatePostParams{
		AccountID:   accountID,
		Title:       req.Title,
		Content:     req.Content,
		ContentType: req.ContentType,
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray(req.Tags),
		MediaIDs:    mediaIDs,
	}

	created, err := h.processor.CreatePost(ctx, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, created)
}

func (h *Handler) HandleGetPost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	post, err := h.processor.GetPost(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, post)
}

func (h *Handler) HandleListPosts(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	status := c.Query("status")
	contentType := c.Query("content_type")
	source := c.Query("source")

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

	listParams := store.ListPostsParams{
		AccountID: accountID,
		Limit:     limit,
		Offset:    offset,
	}
	if status != "" {
		listParams.Status = &status
	}
	if contentType != "" {
		listParams.ContentType = &contentType
	}
	if source != "" {
		listParams.Source = &source
	}

	posts, err := h.processor.ListPosts(ctx, listParams)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, posts)
}

func (h *Handler) HandleUpdatePost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	var req UpdatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	updateParams := store.UpdatePostParams{
		Title:       req.Title,
		Content:     req.Content,
		ContentType: req.ContentType,
	}
	if req.Tags != nil {
		updateParams.Tags = store.StringArray(req.Tags)
	}

	updated, err := h.processor.UpdatePost(ctx, accountID, postID, updateParams)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) HandleDeletePost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	if err := h.processor.DeletePost(ctx, accountID, postID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
}

// HandleUnlinkMedia removes a single media reference from a post. The media
// row + S3 object are preserved; only this post's attachment is dropped.
func (h *Handler) HandleUnlinkMedia(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}
	mediaID, err := uuid.Parse(c.Param("mediaID"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
		observability.Field{Key: "media_id", Value: mediaID.String()},
	)

	if err := h.processor.UnlinkMedia(ctx, accountID, postID, mediaID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media unlinked from post"})
}

func (h *Handler) HandlePublishPost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	var req PublishPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	if err := h.processor.PublishPost(ctx, accountID, postID, req.Platforms); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post queued for publishing"})
}

func (h *Handler) HandleSchedulePost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	var req SchedulePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid scheduled_at format, expected RFC3339")
		return
	}

	updated, err := h.processor.SchedulePost(ctx, accountID, postID, scheduledAt)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (h *Handler) HandleSaveDraft(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req SaveDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	mediaIDs := make(store.UUIDArray, 0, len(req.MediaIDs))
	for _, idStr := range req.MediaIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media ID format")
			return
		}
		mediaIDs = append(mediaIDs, id)
	}

	platforms := make([]processor.PlatformDraftContent, 0, len(req.Platforms))
	for _, p := range req.Platforms {
		platforms = append(platforms, processor.PlatformDraftContent{
			Platform:       p.Platform,
			Content:        p.Content,
			ThreadSegments: p.ThreadSegments,
		})
	}

	params := processor.SaveDraftParams{
		AccountID:   accountID,
		Content:     req.Content,
		ContentType: req.ContentType,
		Tags:        req.Tags,
		MediaIDs:    mediaIDs,
		AIGenerated: req.AIGenerated,
		BaseContent: req.BaseContent,
		Platforms:   platforms,
	}

	post, err := h.processor.SaveDraft(ctx, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, post)
}

func (h *Handler) HandleGetPostDetails(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	result, err := h.processor.GetPostWithPlatformPosts(ctx, accountID, postID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) HandleUpdateDraft(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	var req SaveDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	mediaIDs := make(store.UUIDArray, 0, len(req.MediaIDs))
	for _, idStr := range req.MediaIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid media ID format")
			return
		}
		mediaIDs = append(mediaIDs, id)
	}

	platforms := make([]processor.PlatformDraftContent, 0, len(req.Platforms))
	for _, p := range req.Platforms {
		platforms = append(platforms, processor.PlatformDraftContent{
			Platform:       p.Platform,
			Content:        p.Content,
			ThreadSegments: p.ThreadSegments,
		})
	}

	params := processor.UpdateDraftParams{
		AccountID:   accountID,
		PostID:      postID,
		Content:     req.Content,
		ContentType: req.ContentType,
		Tags:        req.Tags,
		MediaIDs:    mediaIDs,
		AIGenerated: req.AIGenerated,
		BaseContent: req.BaseContent,
		Platforms:   platforms,
	}

	post, err := h.processor.UpdateDraft(ctx, params)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, post)
}

func (h *Handler) HandleRetryPost(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	if err := h.processor.RetryFailedPlatformPosts(ctx, accountID, postID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Failed platform posts queued for retry"})
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrPostNotFound):
		apierrors.NotFound(c, "Post not found")
	case errors.Is(err, processor.ErrFailedCreatePost):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrFailedUpdatePost):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrFailedDeletePost):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrMediaNotAttached):
		apierrors.Conflict(c, "MEDIA_NOT_ATTACHED", "Media is not attached to this post")
	case errors.Is(err, processor.ErrFailedUnlinkMedia):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrFailedSaveDraft):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrFailedRetryPost):
		apierrors.InternalError(c, err)
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
