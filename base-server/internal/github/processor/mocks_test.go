package processor

import (
	"context"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockGitHubStore is a manual mock for GitHubStore
type MockGitHubStore struct {
	CreateGitHubEventFn          func(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error)
	GetGitHubEventByDeliveryIDFn func(ctx context.Context, deliveryID string) (store.GitHubEvent, error)
	ListUnprocessedGitHubEventsFn func(ctx context.Context, limit int) ([]store.GitHubEvent, error)
	MarkGitHubEventProcessedFn   func(ctx context.Context, id uuid.UUID, postID *uuid.UUID) error
}

func (m *MockGitHubStore) CreateGitHubEvent(ctx context.Context, params store.CreateGitHubEventParams) (store.GitHubEvent, error) {
	return m.CreateGitHubEventFn(ctx, params)
}

func (m *MockGitHubStore) GetGitHubEventByDeliveryID(ctx context.Context, deliveryID string) (store.GitHubEvent, error) {
	return m.GetGitHubEventByDeliveryIDFn(ctx, deliveryID)
}

func (m *MockGitHubStore) ListUnprocessedGitHubEvents(ctx context.Context, limit int) ([]store.GitHubEvent, error) {
	return m.ListUnprocessedGitHubEventsFn(ctx, limit)
}

func (m *MockGitHubStore) MarkGitHubEventProcessed(ctx context.Context, id uuid.UUID, postID *uuid.UUID) error {
	return m.MarkGitHubEventProcessedFn(ctx, id, postID)
}
