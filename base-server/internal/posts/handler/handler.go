package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"errors"
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
	GetCalendarMonth(ctx context.Context, accountID uuid.UUID, year, month int) (processor.CalendarMonth, error)
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
	case errors.Is(err, processor.ErrInvalidCalendarParams):
		apierrors.BadRequest(c, "INVALID_INPUT", "year must be 2000-2100 and month must be 1-12")
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
