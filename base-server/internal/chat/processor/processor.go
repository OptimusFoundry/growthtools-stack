package processor

import (
	"context"
	"errors"
	"strings"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

var (
	ErrStreamConversation    = errors.New("failed to stream conversation")
	ErrListConversations     = errors.New("failed to list conversations")
	ErrGetConversation       = errors.New("failed to get conversation")
	ErrDeleteConversation    = errors.New("failed to delete conversation")
	ErrConversationNotFound  = errors.New("conversation not found")
	ErrSaveMessage           = errors.New("failed to save message")
)

const (
	roleUser      = "user"
	roleAssistant = "assistant"

	defaultSystemPrompt = "You are a helpful AI assistant for a social media management platform. " +
		"Help users create engaging content, develop their social media strategy, and manage their online presence effectively."

	maxContextMessages = 20
	maxResponseTokens  = 2048
)

// ChatStore defines the database operations required by ChatProcessor.
type ChatStore interface {
	CreateAIConversation(ctx context.Context, accountID uuid.UUID, title *string) (store.AIConversation, error)
	GetAIConversationByID(ctx context.Context, accountID, id uuid.UUID) (store.AIConversation, error)
	ListAIConversations(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.AIConversation, error)
	DeleteAIConversation(ctx context.Context, accountID, id uuid.UUID) error
	UpdateAIConversationTitle(ctx context.Context, accountID, id uuid.UUID, title string) error
	CreateAIMessage(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error)
	GetAIMessagesByConversation(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error)
}

// AIClient defines the AI operations required by ChatProcessor.
type AIClient interface {
	CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

// ChatProcessor handles AI chat conversation logic.
type ChatProcessor struct {
	store    ChatStore
	aiClient AIClient
	logger   *observability.Logger
}

// New creates a new ChatProcessor.
func New(store ChatStore, aiClient AIClient, logger *observability.Logger) ChatProcessor {
	return ChatProcessor{
		store:    store,
		aiClient: aiClient,
		logger:   logger,
	}
}

// StreamConversation creates or continues a conversation, streams the Claude response,
// and persists both the user message and the assistant reply.
// Returns the conversation ID and any error.
func (p *ChatProcessor) StreamConversation(
	ctx context.Context,
	accountID uuid.UUID,
	conversationID *uuid.UUID,
	message string,
	onChunk func(string),
) (uuid.UUID, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "stream_conversation"},
	)

	var conv store.AIConversation
	var err error

	if conversationID == nil {
		// Derive a title from the first 60 characters of the message.
		title := deriveTitle(message)
		conv, err = p.store.CreateAIConversation(ctx, accountID, &title)
		if err != nil {
			p.logger.Error(ctx, "failed to create ai conversation", err)
			return uuid.UUID{}, ErrStreamConversation
		}
	} else {
		conv, err = p.store.GetAIConversationByID(ctx, accountID, *conversationID)
		if err != nil {
			p.logger.Error(ctx, "failed to get ai conversation", err)
			if errors.Is(err, store.ErrNotFound) {
				return uuid.UUID{}, ErrConversationNotFound
			}
			return uuid.UUID{}, ErrStreamConversation
		}
	}

	ctx = observability.WithFields(ctx, observability.Field{Key: "conversation_id", Value: conv.ID.String()})

	// Save the user message.
	_, err = p.store.CreateAIMessage(ctx, conv.ID, roleUser, message)
	if err != nil {
		p.logger.Error(ctx, "failed to save user message", err)
		return conv.ID, ErrSaveMessage
	}

	// Load conversation history for context.
	history, err := p.store.GetAIMessagesByConversation(ctx, conv.ID)
	if err != nil {
		p.logger.Error(ctx, "failed to load conversation history", err)
		return conv.ID, ErrStreamConversation
	}

	apiMessages := buildAPIMessages(history, maxContextMessages)

	// Collect the full streamed response so it can be persisted.
	var responseBuilder strings.Builder
	wrappedOnChunk := func(chunk string) {
		responseBuilder.WriteString(chunk)
		onChunk(chunk)
	}

	if err := p.aiClient.StreamMessage(ctx, defaultSystemPrompt, apiMessages, maxResponseTokens, wrappedOnChunk); err != nil {
		p.logger.Error(ctx, "failed to stream ai response", err)
		return conv.ID, ErrStreamConversation
	}

	assistantReply := responseBuilder.String()
	if _, err := p.store.CreateAIMessage(ctx, conv.ID, roleAssistant, assistantReply); err != nil {
		p.logger.Error(ctx, "failed to save assistant message", err)
		// Non-fatal: streaming already completed; log and continue.
	}

	return conv.ID, nil
}

// ListConversations returns a paginated list of conversations for an account.
func (p *ChatProcessor) ListConversations(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.AIConversation, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "list_conversations"},
	)

	conversations, err := p.store.ListAIConversations(ctx, accountID, limit, offset)
	if err != nil {
		p.logger.Error(ctx, "failed to list conversations", err)
		return nil, ErrListConversations
	}

	return conversations, nil
}

// GetConversation returns a single conversation and its messages.
func (p *ChatProcessor) GetConversation(ctx context.Context, accountID uuid.UUID, id uuid.UUID) (store.AIConversation, []store.AIMessage, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "conversation_id", Value: id.String()},
		observability.Field{Key: "operation", Value: "get_conversation"},
	)

	conv, err := p.store.GetAIConversationByID(ctx, accountID, id)
	if err != nil {
		p.logger.Error(ctx, "failed to get conversation", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.AIConversation{}, nil, ErrConversationNotFound
		}
		return store.AIConversation{}, nil, ErrGetConversation
	}

	messages, err := p.store.GetAIMessagesByConversation(ctx, id)
	if err != nil {
		p.logger.Error(ctx, "failed to get conversation messages", err)
		return store.AIConversation{}, nil, ErrGetConversation
	}

	return conv, messages, nil
}

// DeleteConversation soft-deletes a conversation owned by the account.
func (p *ChatProcessor) DeleteConversation(ctx context.Context, accountID uuid.UUID, id uuid.UUID) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "conversation_id", Value: id.String()},
		observability.Field{Key: "operation", Value: "delete_conversation"},
	)

	if err := p.store.DeleteAIConversation(ctx, accountID, id); err != nil {
		p.logger.Error(ctx, "failed to delete conversation", err)
		if errors.Is(err, store.ErrNotFound) {
			return ErrConversationNotFound
		}
		return ErrDeleteConversation
	}

	return nil
}

// buildAPIMessages converts store messages to Anthropic API messages,
// keeping at most maxMessages to bound context size.
func buildAPIMessages(messages []store.AIMessage, maxMessages int) []aiclient.Message {
	start := 0
	if len(messages) > maxMessages {
		start = len(messages) - maxMessages
	}

	result := make([]aiclient.Message, 0, len(messages)-start)
	for _, m := range messages[start:] {
		result = append(result, aiclient.Message{
			Role:    m.Role,
			Content: m.Content,
		})
	}
	return result
}

// deriveTitle creates a short conversation title from the first message.
func deriveTitle(message string) string {
	const maxLen = 60
	if len(message) <= maxLen {
		return message
	}
	return message[:maxLen] + "..."
}
