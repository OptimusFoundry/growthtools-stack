package processor

import (
	"context"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockChatStore is a manual mock for ChatStore
type MockChatStore struct {
	CreateAIConversationFn        func(ctx context.Context, accountID uuid.UUID, title *string) (store.AIConversation, error)
	GetAIConversationByIDFn       func(ctx context.Context, accountID, id uuid.UUID) (store.AIConversation, error)
	ListAIConversationsFn         func(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.AIConversation, error)
	DeleteAIConversationFn        func(ctx context.Context, accountID, id uuid.UUID) error
	UpdateAIConversationTitleFn   func(ctx context.Context, accountID, id uuid.UUID, title string) error
	CreateAIMessageFn             func(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error)
	GetAIMessagesByConversationFn func(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error)
}

func (m *MockChatStore) CreateAIConversation(ctx context.Context, accountID uuid.UUID, title *string) (store.AIConversation, error) {
	return m.CreateAIConversationFn(ctx, accountID, title)
}

func (m *MockChatStore) GetAIConversationByID(ctx context.Context, accountID, id uuid.UUID) (store.AIConversation, error) {
	return m.GetAIConversationByIDFn(ctx, accountID, id)
}

func (m *MockChatStore) ListAIConversations(ctx context.Context, accountID uuid.UUID, limit, offset int) ([]store.AIConversation, error) {
	return m.ListAIConversationsFn(ctx, accountID, limit, offset)
}

func (m *MockChatStore) DeleteAIConversation(ctx context.Context, accountID, id uuid.UUID) error {
	return m.DeleteAIConversationFn(ctx, accountID, id)
}

func (m *MockChatStore) UpdateAIConversationTitle(ctx context.Context, accountID, id uuid.UUID, title string) error {
	return m.UpdateAIConversationTitleFn(ctx, accountID, id, title)
}

func (m *MockChatStore) CreateAIMessage(ctx context.Context, conversationID uuid.UUID, role, content string) (store.AIMessage, error) {
	return m.CreateAIMessageFn(ctx, conversationID, role, content)
}

func (m *MockChatStore) GetAIMessagesByConversation(ctx context.Context, conversationID uuid.UUID) ([]store.AIMessage, error) {
	return m.GetAIMessagesByConversationFn(ctx, conversationID)
}

// MockChatAIClient is a manual mock for AIClient
type MockChatAIClient struct {
	CreateMessageFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessageFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

func (m *MockChatAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return m.CreateMessageFn(ctx, systemPrompt, messages, maxTokens)
}

func (m *MockChatAIClient) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return m.StreamMessageFn(ctx, systemPrompt, messages, maxTokens, onChunk)
}
