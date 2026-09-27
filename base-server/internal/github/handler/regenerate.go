package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=regenerate.go -destination=regenerate_mocks_test.go -package=handler

import (
	"context"
	"errors"
	"net/http"

	"base-server/internal/github/processor"
	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DraftRegenerator rewrites a commit-generated draft around chosen capture
// media. Satisfied by *processor.DraftGenerator.
type DraftRegenerator interface {
	RegenerateDraftWithMedia(ctx context.Context, accountID, postID uuid.UUID, mediaIDs []uuid.UUID) (store.Post, error)
}

// WithDraftRegenerator wires the regenerate endpoint's dependency.
func (h Handler) WithDraftRegenerator(r DraftRegenerator) Handler {
	h.regenerator = r
	return h
}

type regenerateDraftRequest struct {
	MediaIDs []uuid.UUID `json:"media_ids"`
}

// HandleRegenerateDraft rewrites a draft's copy using the selected capture
// media, which also become the post's media.
// POST /api/protected/posts/:id/regenerate
func (h *Handler) HandleRegenerateDraft(c *gin.Context) {
	ctx := c.Request.Context()

	if h.regenerator == nil {
		apierrors.InternalError(c, errors.New("draft regenerator not configured"))
		return
	}

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid post ID format")
		return
	}

	var req regenerateDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "media_ids must be a list of media IDs")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "post_id", Value: postID.String()},
	)

	post, err := h.regenerator.RegenerateDraftWithMedia(ctx, accountID, postID, req.MediaIDs)
	if err != nil {
		switch {
		case errors.Is(err, processor.ErrRegenerateNoMedia):
			apierrors.BadRequest(c, "NO_MEDIA_SELECTED", "Select at least one media item")
		case errors.Is(err, processor.ErrRegenerateMediaNotInPool):
			apierrors.BadRequest(c, "MEDIA_NOT_IN_CAPTURE", "Selected media is not one of this post's captures")
		case errors.Is(err, processor.ErrRegeneratePostNotFound):
			apierrors.NotFound(c, "Post not found")
		case errors.Is(err, processor.ErrRegenerateNotDraft):
			apierrors.Conflict(c, "POST_NOT_DRAFT", "Only draft posts can be regenerated")
		case errors.Is(err, processor.ErrRegenerateUnsupported):
			apierrors.Conflict(c, "NOT_COMMIT_POST", "This post was not generated from a commit")
		case errors.Is(err, processor.ErrDraftGuardTripped):
			apierrors.Conflict(c, "NO_PLATFORMS", "No connected platforms to draft for")
		default:
			apierrors.InternalError(c, err)
		}
		return
	}

	c.JSON(http.StatusOK, post)
}

func (h *Handler) getAccountID(c *gin.Context) (uuid.UUID, bool) {
	raw, exists := c.Get("Account-ID")
	if !exists {
		apierrors.Unauthorized(c, "Account ID not found in context")
		return uuid.Nil, false
	}
	id, err := uuid.Parse(raw.(string))
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid account ID format")
		return uuid.Nil, false
	}
	return id, true
}
