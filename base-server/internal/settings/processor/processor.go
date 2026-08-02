package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"errors"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// SettingsStore defines the database operations required by SettingsProcessor
type SettingsStore interface {
	GetVoiceProfileByAccount(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error)
	CreateVoiceProfile(ctx context.Context, params store.CreateVoiceProfileParams) (store.VoiceProfile, error)
	UpdateVoiceProfile(ctx context.Context, accountID uuid.UUID, params store.UpdateVoiceProfileParams) (store.VoiceProfile, error)
	GetSitePublishTargetByAccount(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error)
	CreateSitePublishTarget(ctx context.Context, params store.CreateSitePublishTargetParams) (store.SitePublishTarget, error)
	UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, params store.UpdateSitePublishTargetParams) (store.SitePublishTarget, error)
}

var ErrVoiceProfileNotFound = errors.New("voice profile not found")
var ErrSitePublishTargetNotFound = errors.New("site publish target not found")

type SettingsProcessor struct {
	store  SettingsStore
	logger *observability.Logger
}

func New(store SettingsStore, logger *observability.Logger) SettingsProcessor {
	return SettingsProcessor{
		store:  store,
		logger: logger,
	}
}

// GetVoiceProfile retrieves the voice profile for the given account
func (p *SettingsProcessor) GetVoiceProfile(ctx context.Context, accountID uuid.UUID) (store.VoiceProfile, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "get_voice_profile"},
	)

	profile, err := p.store.GetVoiceProfileByAccount(ctx, accountID)
	if err != nil {
		p.logger.Error(ctx, "failed to get voice profile", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.VoiceProfile{}, ErrVoiceProfileNotFound
		}
		return store.VoiceProfile{}, err
	}
	return profile, nil
}

// UpdateVoiceProfile upserts the voice profile for the given account.
// If a profile already exists it is updated; otherwise a new one is created.
func (p *SettingsProcessor) UpdateVoiceProfile(ctx context.Context, accountID uuid.UUID, tone, style string, examplePosts []string, industry, targetAudience, customInstructions *string) (store.VoiceProfile, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "upsert_voice_profile"},
	)

	existing, err := p.store.GetVoiceProfileByAccount(ctx, accountID)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check existing voice profile", err)
		return store.VoiceProfile{}, err
	}

	if errors.Is(err, store.ErrNotFound) || existing.ID == uuid.Nil {
		// Create a new profile
		createParams := store.CreateVoiceProfileParams{
			AccountID:          accountID,
			Tone:               tone,
			Style:              style,
			ExamplePosts:       store.StringArray(examplePosts),
			Industry:           industry,
			TargetAudience:     targetAudience,
			CustomInstructions: customInstructions,
		}
		created, err := p.store.CreateVoiceProfile(ctx, createParams)
		if err != nil {
			p.logger.Error(ctx, "failed to create voice profile", err)
			return store.VoiceProfile{}, err
		}
		return created, nil
	}

	// Update the existing profile
	updateParams := store.UpdateVoiceProfileParams{
		Tone:               &tone,
		Style:              &style,
		ExamplePosts:       store.StringArray(examplePosts),
		Industry:           industry,
		TargetAudience:     targetAudience,
		CustomInstructions: customInstructions,
	}

	updated, err := p.store.UpdateVoiceProfile(ctx, accountID, updateParams)
	if err != nil {
		p.logger.Error(ctx, "failed to update voice profile", err)
		return store.VoiceProfile{}, err
	}
	return updated, nil
}

// GetSitePublishTarget retrieves the site publish target for the given account
func (p *SettingsProcessor) GetSitePublishTarget(ctx context.Context, accountID uuid.UUID) (store.SitePublishTarget, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "get_site_publish_target"},
	)

	target, err := p.store.GetSitePublishTargetByAccount(ctx, accountID)
	if err != nil {
		p.logger.Error(ctx, "failed to get site publish target", err)
		if errors.Is(err, store.ErrNotFound) {
			return store.SitePublishTarget{}, ErrSitePublishTargetNotFound
		}
		return store.SitePublishTarget{}, err
	}
	return target, nil
}

// UpdateSitePublishTarget upserts the site publish target for the given account.
// If a target already exists it is updated; otherwise a new one is created.
func (p *SettingsProcessor) UpdateSitePublishTarget(ctx context.Context, accountID uuid.UUID, repoOwner, repoName, baseBranch, contentPath string) (store.SitePublishTarget, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "operation", Value: "upsert_site_publish_target"},
	)

	existing, err := p.store.GetSitePublishTargetByAccount(ctx, accountID)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		p.logger.Error(ctx, "failed to check existing site publish target", err)
		return store.SitePublishTarget{}, err
	}

	if errors.Is(err, store.ErrNotFound) || existing.ID == uuid.Nil {
		created, err := p.store.CreateSitePublishTarget(ctx, store.CreateSitePublishTargetParams{
			AccountID: accountID, RepoOwner: repoOwner, RepoName: repoName, BaseBranch: baseBranch, ContentPath: contentPath,
		})
		if err != nil {
			p.logger.Error(ctx, "failed to create site publish target", err)
			return store.SitePublishTarget{}, err
		}
		return created, nil
	}

	updated, err := p.store.UpdateSitePublishTarget(ctx, accountID, store.UpdateSitePublishTargetParams{
		RepoOwner: &repoOwner, RepoName: &repoName, BaseBranch: &baseBranch, ContentPath: &contentPath,
	})
	if err != nil {
		p.logger.Error(ctx, "failed to update site publish target", err)
		return store.SitePublishTarget{}, err
	}
	return updated, nil
}
