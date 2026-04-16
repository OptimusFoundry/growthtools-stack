package processor

import (
	"context"
	"time"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockPlatformStore is a manual mock for PlatformStore
type MockPlatformStore struct {
	CreatePlatformConnectionFn                    func(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error)
	GetPlatformConnectionByIDFn                   func(ctx context.Context, accountID, id uuid.UUID) (store.PlatformConnection, error)
	GetPlatformConnectionByAccountAndPlatformFn   func(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error)
	ListPlatformConnectionsByAccountFn            func(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	UpdatePlatformConnectionStatusFn              func(ctx context.Context, accountID, id uuid.UUID, status string) error
	UpdatePlatformConnectionTokensFn              func(ctx context.Context, accountID, id uuid.UUID, accessToken string, refreshToken *string, expiresAt *time.Time) error
	DeletePlatformConnectionFn                    func(ctx context.Context, accountID, id uuid.UUID) error
}

func (m *MockPlatformStore) CreatePlatformConnection(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error) {
	return m.CreatePlatformConnectionFn(ctx, params)
}

func (m *MockPlatformStore) GetPlatformConnectionByID(ctx context.Context, accountID, id uuid.UUID) (store.PlatformConnection, error) {
	return m.GetPlatformConnectionByIDFn(ctx, accountID, id)
}

func (m *MockPlatformStore) GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error) {
	return m.GetPlatformConnectionByAccountAndPlatformFn(ctx, accountID, platform, platformUserID)
}

func (m *MockPlatformStore) ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error) {
	return m.ListPlatformConnectionsByAccountFn(ctx, accountID)
}

func (m *MockPlatformStore) UpdatePlatformConnectionStatus(ctx context.Context, accountID, id uuid.UUID, status string) error {
	if m.UpdatePlatformConnectionStatusFn != nil {
		return m.UpdatePlatformConnectionStatusFn(ctx, accountID, id, status)
	}
	return nil
}

func (m *MockPlatformStore) UpdatePlatformConnectionTokens(ctx context.Context, accountID, id uuid.UUID, accessToken string, refreshToken *string, expiresAt *time.Time) error {
	if m.UpdatePlatformConnectionTokensFn != nil {
		return m.UpdatePlatformConnectionTokensFn(ctx, accountID, id, accessToken, refreshToken, expiresAt)
	}
	return nil
}

func (m *MockPlatformStore) DeletePlatformConnection(ctx context.Context, accountID, id uuid.UUID) error {
	return m.DeletePlatformConnectionFn(ctx, accountID, id)
}

// MockXClient is a manual mock for XClient
type MockXClient struct {
	VerifyCredentialsFn func(ctx context.Context, accessToken string) error
}

func (m *MockXClient) VerifyCredentials(ctx context.Context, accessToken string) error {
	if m.VerifyCredentialsFn != nil {
		return m.VerifyCredentialsFn(ctx, accessToken)
	}
	return nil
}

// MockThreadsClient is a manual mock for ThreadsClient
type MockThreadsClient struct {
	VerifyCredentialsFn func(ctx context.Context, accessToken string) error
}

func (m *MockThreadsClient) VerifyCredentials(ctx context.Context, accessToken string) error {
	if m.VerifyCredentialsFn != nil {
		return m.VerifyCredentialsFn(ctx, accessToken)
	}
	return nil
}

// MockBlueskyClient is a manual mock for BlueskyClient
type MockBlueskyClient struct {
	VerifyCredentialsFn func(ctx context.Context, handle, appPassword string) error
}

func (m *MockBlueskyClient) VerifyCredentials(ctx context.Context, handle, appPassword string) error {
	if m.VerifyCredentialsFn != nil {
		return m.VerifyCredentialsFn(ctx, handle, appPassword)
	}
	return nil
}
