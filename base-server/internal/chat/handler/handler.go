package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"base-server/internal/infra/apierrors"
	"base-server/internal/chat/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ChatProcessor defines the chat operations required by the handler.
type ChatProcessor interface {
	StreamConversation(ctx context.Context, accountID uuid.UUID, conversationID *uuid.UUID, message string, onChunk func(string)) (uuid.UUID, error)
	ListConversations(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.AIConversation, error)
	GetConversation(ctx context.Context, accountID uuid.UUID, id uuid.UUID) (store.AIConversation, []store.AIMessage, error)
	DeleteConversation(ctx context.Context, accountID uuid.UUID, id uuid.UUID) error
}

// Handler handles HTTP requests for AI chat.
type Handler struct {
	processor ChatProcessor
	logger    *observability.Logger
}

// New creates a new chat Handler.
func New(proc ChatProcessor, logger *observability.Logger) Handler {
	return Handler{
		processor: proc,
		logger:    logger,
	}
}

// ChatRequest is the request body for the chat endpoint.
type ChatRequest struct {
	ConversationID *string `json:"conversation_id"`
	Message        string  `json:"message" binding:"required"`
}

// HandleChat streams a Claude response for a chat message using SSE.
func (h *Handler) HandleChat(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierrors.ValidationError(c, err)
		return
	}

	var conversationID *uuid.UUID
	if req.ConversationID != nil && *req.ConversationID != "" {
		parsed, err := uuid.Parse(*req.ConversationID)
		if err != nil {
			apierrors.BadRequest(c, "INVALID_INPUT", "Invalid conversation ID format")
			return
		}
		conversationID = &parsed
	}

	// Set SSE headers before writing anything.
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher, canFlush := c.Writer.(http.Flusher)

	var finalConvID uuid.UUID

	convID, err := h.processor.StreamConversation(ctx, accountID, conversationID, req.Message, func(chunk string) {
		fmt.Fprintf(c.Writer, "data: %s\n\n", chunk)
		if canFlush {
			flusher.Flush()
		}
	})

	finalConvID = convID

	if err != nil {
		h.logger.Error(ctx, "streaming conversation failed", err)
		if errors.Is(err, processor.ErrConversationNotFound) {
			fmt.Fprintf(c.Writer, "event: error\ndata: conversation not found\n\n")
		} else {
			fmt.Fprintf(c.Writer, "event: error\ndata: failed to process message\n\n")
		}
		if canFlush {
			flusher.Flush()
		}
		return
	}

	// Send a final event with the conversation ID so the client can persist it.
	fmt.Fprintf(c.Writer, "event: done\ndata: {\"conversation_id\":\"%s\"}\n\n", finalConvID.String())
	if canFlush {
		flusher.Flush()
	}
}

// HandleGetConversations returns a paginated list of conversations.
func (h *Handler) HandleGetConversations(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "account_id", Value: accountID.String()})

	limit := 20
	offset := 0

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	conversations, err := h.processor.ListConversations(ctx, accountID, limit, offset)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}

// HandleGetConversation returns a single conversation with its messages.
func (h *Handler) HandleGetConversation(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	convIDStr := c.Param("id")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid conversation ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "conversation_id", Value: convID.String()},
	)

	conv, messages, err := h.processor.GetConversation(ctx, accountID, convID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation": conv,
		"messages":     messages,
	})
}

// HandleDeleteConversation soft-deletes a conversation.
func (h *Handler) HandleDeleteConversation(c *gin.Context) {
	ctx := c.Request.Context()

	accountID, ok := h.getAccountID(c)
	if !ok {
		return
	}

	convIDStr := c.Param("id")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		apierrors.BadRequest(c, "INVALID_INPUT", "Invalid conversation ID format")
		return
	}

	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "conversation_id", Value: convID.String()},
	)

	if err := h.processor.DeleteConversation(ctx, accountID, convID); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "conversation deleted"})
}

// handleError maps processor errors to appropriate API responses.
func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, processor.ErrConversationNotFound):
		apierrors.NotFound(c, "Conversation not found")
	case errors.Is(err, processor.ErrListConversations):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrGetConversation):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrDeleteConversation):
		apierrors.InternalError(c, err)
	case errors.Is(err, processor.ErrStreamConversation):
		apierrors.ServiceUnavailable(c, "STREAM_FAILED", "Failed to stream response", err)
	default:
		apierrors.InternalError(c, err)
	}
}

// getAccountID extracts and validates the account ID from the gin context.
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
