package handler

//go:generate go run go.uber.org/mock/mockgen@latest -source=handler.go -destination=mocks_test.go -package=handler

import (
	"context"
	"errors"
	"net/http"

	"base-server/internal/infra/apierrors"
	"base-server/internal/infra/observability"
	"base-server/internal/showcase/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// errNoAccountID indicates the Account-ID context value set by the JWT
// middleware was missing or malformed.
var errNoAccountID = errors.New("account id not found in context")

// ShowcaseProcessorIface defines the showcase operations required by the
// handler.
type ShowcaseProcessorIface interface {
	CreateShowcaseJob(ctx context.Context, accountID uuid.UUID, brief string) (jobID uuid.UUID, err error)
}

// CreateShowcaseJobRequest is the request body for HandleCreate.
type CreateShowcaseJobRequest struct {
	Brief string `json:"brief" binding:"required"`
}

// CreateShowcaseJobResponse is the response body for HandleCreate.
type CreateShowcaseJobResponse struct {
	JobID  string `json:"job_id"`
	Status string `json:"status"`
}

type Handler struct {
	processor ShowcaseProcessorIface
	logger    *observability.Logger
}

func New(processor ShowcaseProcessorIface, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

// HandleCreate accepts a natural-language brief and enqueues a showcase
// capture job for the account's matched component.
func (h *Handler) HandleCreate(c *gin.Context) {
	ctx := c.Request.Context()

	var req CreateShowcaseJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	accountID, err := accountIDFromContext(c)
	if err != nil {
		apierrors.Unauthorized(c, "Account ID not found in context")
		return
	}
	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	jobID, err := h.processor.CreateShowcaseJob(ctx, accountID, req.Brief)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusAccepted, CreateShowcaseJobResponse{
		JobID:  jobID.String(),
		Status: "capturing",
	})
}

// handleError maps processor errors to apierrors responses.
func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrStorybookNotConfigured):
		apierrors.BadRequest(c, "STORYBOOK_NOT_CONFIGURED", "Connect a GitHub repo with a Storybook URL configured before generating a showcase post.")
	case errors.Is(err, processor.ErrNoComponentMatch):
		apierrors.BadRequest(c, "SHOWCASE_NO_COMPONENT_MATCH", "The brief did not confidently match a single component. Try a more specific description.")
	case errors.Is(err, processor.ErrPublishFailed):
		apierrors.ServiceUnavailable(c, "SHOWCASE_ENQUEUE_FAILED", "Failed to enqueue the showcase capture request. Please try again.", err)
	default:
		apierrors.InternalError(c, err)
	}
}

// accountIDFromContext extracts and parses the Account-ID set on the gin
// context by the JWT middleware.
func accountIDFromContext(c *gin.Context) (uuid.UUID, error) {
	accountIDVal, exists := c.Get("Account-ID")
	if !exists {
		return uuid.UUID{}, errNoAccountID
	}
	accountIDStr, ok := accountIDVal.(string)
	if !ok {
		return uuid.UUID{}, errNoAccountID
	}
	return uuid.Parse(accountIDStr)
}
