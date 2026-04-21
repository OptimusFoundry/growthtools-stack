package handler

import (
	"base-server/internal/infra/apierrors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v85/webhook"
)

func (h *Handler) HandleWebhook(c *gin.Context) {
	ctx := c.Request.Context()

	// Read the request body
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "failed to read request body")
		return
	}

	// Retrieve the Stripe-Signature header
	signatureHeader := c.GetHeader("Stripe-Signature")
	if signatureHeader == "" {
		apierrors.BadRequest(c, "INVALID_INPUT", "missing Stripe-Signature header")
		return
	}
	event, err := webhook.ConstructEventWithOptions(payload, signatureHeader, h.processor.WebhookSecret, webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true})
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "invalid webhook signature")
		return
	}
	// Handle the event

	err = h.processor.HandleWebhook(ctx, event)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
	return
}
