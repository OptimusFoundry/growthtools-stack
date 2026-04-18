package handler

import (
	"net/http"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/posts/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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
