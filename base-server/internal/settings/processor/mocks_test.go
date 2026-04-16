package processor

import (
	"context"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockSettingsStore is a manual mock for SettingsStore
type MockSettingsStore struct {
	GetVoiceProfileByAccountFn func(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
	CreateVoiceProfileFn       func(ctx context.Context, params store.CreateVoiceProfileParams) (store.VoiceProfile, error)
	UpdateVoiceProfileFn       func(ctx context.Context, accountID uuid.UUID, params store.UpdateVoiceProfileParams) (store.VoiceProfile, error)
}

func (m *MockSettingsStore) GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error) {
	return m.GetVoiceProfileByAccountFn(ctx, accountID)
}

func (m *MockSettingsStore) CreateVoiceProfile(ctx context.Context, params store.CreateVoiceProfileParams) (store.VoiceProfile, error) {
	return m.CreateVoiceProfileFn(ctx, params)
}

func (m *MockSettingsStore) UpdateVoiceProfile(ctx context.Context, accountID uuid.UUID, params store.UpdateVoiceProfileParams) (store.VoiceProfile, error) {
	return m.UpdateVoiceProfileFn(ctx, accountID, params)
}
