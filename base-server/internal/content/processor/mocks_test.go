package processor

import (
	"context"

	"base-server/internal/infra/clients/aiclient"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockContentStore is a manual mock for ContentStore
type MockContentStore struct {
	GetVoiceProfileByAccountFn func(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
}

func (m *MockContentStore) GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error) {
	return m.GetVoiceProfileByAccountFn(ctx, accountID)
}

// MockAIClient is a manual mock for AIClient
type MockAIClient struct {
	CreateMessageFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error)
	StreamMessageFn func(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error
}

func (m *MockAIClient) CreateMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int) (string, error) {
	return m.CreateMessageFn(ctx, systemPrompt, messages, maxTokens)
}

func (m *MockAIClient) StreamMessage(ctx context.Context, systemPrompt string, messages []aiclient.Message, maxTokens int, onChunk func(string)) error {
	return m.StreamMessageFn(ctx, systemPrompt, messages, maxTokens, onChunk)
}
