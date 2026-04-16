package handler

import (
	"errors"
	"io"
	"net/http"

	"base-server/internal/infra/apierrors"
	"base-server/internal/github/processor"
	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	processor processor.GitHubProcessor
	logger    *observability.Logger
}

func New(processor processor.GitHubProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: processor,
		logger:    logger,
	}
}

// HandleWebhook handles incoming GitHub webhook events.
// This is a public endpoint — authentication is via HMAC signature.
func (h *Handler) HandleWebhook(c *gin.Context) {
	ctx := c.Request.Context()

	eventType := c.GetHeader("X-GitHub-Event")
	deliveryID := c.GetHeader("X-GitHub-Delivery")
	signature := c.GetHeader("X-Hub-Signature-256")

	if eventType == "" || deliveryID == "" || signature == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "Missing required GitHub webhook headers")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "event_type", Value: eventType},
		observability.Field{Key: "delivery_id", Value: deliveryID},
	)

	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		apierrors.InternalError(c, err)
		return
	}

	if err := h.processor.HandleWebhookEvent(ctx, deliveryID, eventType, payload, signature); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook received"})
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrInvalidSignature):
		apierrors.Unauthorized(c, "Invalid webhook signature")
	case errors.Is(err, processor.ErrDuplicateEvent):
		// GitHub expects a 200 for duplicates to stop retrying
		c.JSON(http.StatusOK, gin.H{"message": "Duplicate event ignored"})
	default:
		apierrors.InternalError(c, err)
	}
}
