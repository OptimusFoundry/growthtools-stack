package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"errors"
	"net/http"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/settings/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SettingsProcessor defines the settings operations required by the handler.
type SettingsProcessor interface {
	GetVoiceProfile(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
	UpdateVoiceProfile(ctx context.Context, accountID uuid.UUID, tone, style string, examplePosts []string, industry, targetAudience, customInstructions *string) (store.VoiceProfile, error)
	GetSitePublishTarget(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
	UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, repoOwner, repoName, baseBranch, contentPath string) (store.SitePublishTarget, error)
}

type Handler struct {
	processor SettingsProcessor
	logger    *observability.Logger
}

func New(processor SettingsProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

type UpdateVoiceProfileRequest struct {
	Tone               string   `json:"tone" binding:"required"`
	Style              string   `json:"style" binding:"required"`
	ExamplePosts       []string `json:"example_posts"`
	Industry           *string  `json:"industry"`
	TargetAudience     *string  `json:"target_audience"`
	CustomInstructions *string  `json:"custom_instructions"`
}

type UpdateSitePublishTargetRequest struct {
	RepoOwner   string `json:"repo_owner" binding:"required"`
	RepoName    string `json:"repo_name" binding:"required"`
	BaseBranch  string `json:"base_branch" binding:"required"`
	ContentPath string `json:"content_path" binding:"required"`
}

// HandleGetVoiceProfile returns the voice profile for the authenticated account
func (h *Handler) HandleGetVoiceProfile(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	profile, err := h.processor.GetVoiceProfile(ctx, accountID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}

// HandleUpdateVoiceProfile upserts the voice profile for the authenticated account
func (h *Handler) HandleUpdateVoiceProfile(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req UpdateVoiceProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	if req.ExamplePosts == nil {
		req.ExamplePosts = []string{}
	}

	profile, err := h.processor.UpdateVoiceProfile(
		ctx,
		accountID,
		req.Tone,
		req.Style,
		req.ExamplePosts,
		req.Industry,
		req.TargetAudience,
		req.CustomInstructions,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, profile)
}

// HandleGetSitePublishTarget returns the site publish target for the authenticated account
func (h *Handler) HandleGetSitePublishTarget(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	target, err := h.processor.GetSitePublishTarget(ctx, accountID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, target)
}

// HandleUpdateSitePublishTarget upserts the site publish target for the authenticated account
func (h *Handler) HandleUpdateSitePublishTarget(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req UpdateSitePublishTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	target, err := h.processor.UpdateSitePublishTarget(
		ctx,
		accountID,
		req.RepoOwner,
		req.RepoName,
		req.BaseBranch,
		req.ContentPath,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, target)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrVoiceProfileNotFound):
		apierrors.NotFound(c, "Voice profile not found")
	case errors.Is(err, processor.ErrSitePublishTargetNotFound):
		apierrors.NotFound(c, "Site publish target not found")
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
