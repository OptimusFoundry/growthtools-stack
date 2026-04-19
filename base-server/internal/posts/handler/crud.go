package handler

import (
	"net/http"
	"strconv"
	"time"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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

	var from, to *time.Time
	if fromStr := c.Query("from"); fromStr != "" {
		t, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "from must be a date in YYYY-MM-DD format")
			return
		}
		from = &t
	}
	if toStr := c.Query("to"); toStr != "" {
		t, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "to must be a date in YYYY-MM-DD format")
			return
		}
		endOfDay := t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		to = &endOfDay
	}

	listParams := store.ListPostsParams{
		AccountID: accountID,
		Limit:     limit,
		Offset:    offset,
		From:      from,
		To:        to,
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
