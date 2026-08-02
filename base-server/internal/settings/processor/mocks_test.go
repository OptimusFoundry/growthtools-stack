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

	GetSitePublishTargetByAccountFn func(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
	CreateSitePublishTargetFn       func(ctx context.Context, params store.CreateSitePublishTargetParams) (store.SitePublishTarget, error)
	UpdateSitePublishTargetFn       func(ctx context.Context, accountID uuid.UUID, params store.UpdateSitePublishTargetParams) (store.SitePublishTarget, error)
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

func (m *MockSettingsStore) GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error) {
	return m.GetSitePublishTargetByAccountFn(ctx, accountID)
}
func (m *MockSettingsStore) CreateSitePublishTarget(ctx context.Context, params store.CreateSitePublishTargetParams) (store.SitePublishTarget, error) {
	return m.CreateSitePublishTargetFn(ctx, params)
}
func (m *MockSettingsStore) UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, params store.UpdateSitePublishTargetParams) (store.SitePublishTarget, error) {
	return m.UpdateSitePublishTargetFn(ctx, accountID, params)
}
