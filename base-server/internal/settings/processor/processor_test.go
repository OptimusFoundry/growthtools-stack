package processor

import (
	"context"
	"errors"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSettingsProcessor_GetVoiceProfile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		profileID := uuid.New()
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{ID: profileID, AccountID: aID, Tone: "professional", Style: "concise"}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.GetVoiceProfile(context.Background(), accountID)

		require.NoError(t, err)
		assert.Equal(t, profileID, result.ID)
		assert.Equal(t, "professional", result.Tone)
		assert.Equal(t, "concise", result.Style)
	})

	t.Run("not found returns ErrVoiceProfileNotFound", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetVoiceProfile(context.Background(), accountID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrVoiceProfileNotFound)
	})

	t.Run("other error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetVoiceProfile(context.Background(), accountID)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_UpdateVoiceProfile_Create(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("creates new profile when none exists", func(t *testing.T) {
		t.Parallel()
		profileID := uuid.New()
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, store.ErrNotFound
			},
			CreateVoiceProfileFn: func(ctx context.Context, params store.CreateVoiceProfileParams) (store.VoiceProfile, error) {
				return store.VoiceProfile{
					ID:        profileID,
					AccountID: params.AccountID,
					Tone:      params.Tone,
					Style:     params.Style,
				}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.UpdateVoiceProfile(context.Background(), accountID, "casual", "verbose", nil, nil, nil, nil)

		require.NoError(t, err)
		assert.Equal(t, profileID, result.ID)
		assert.Equal(t, "casual", result.Tone)
		assert.Equal(t, "verbose", result.Style)
	})

	t.Run("create error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("create error")
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, store.ErrNotFound
			},
			CreateVoiceProfileFn: func(ctx context.Context, params store.CreateVoiceProfileParams) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.UpdateVoiceProfile(context.Background(), accountID, "casual", "verbose", nil, nil, nil, nil)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_UpdateVoiceProfile_Update(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("updates existing profile", func(t *testing.T) {
		t.Parallel()
		existingID := uuid.New()
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{ID: existingID, AccountID: aID, Tone: "old", Style: "old"}, nil
			},
			UpdateVoiceProfileFn: func(ctx context.Context, aID uuid.UUID, params store.UpdateVoiceProfileParams) (store.VoiceProfile, error) {
				return store.VoiceProfile{ID: existingID, AccountID: aID, Tone: *params.Tone, Style: *params.Style}, nil
			},
		}
		proc := New(mockStore, logger)

		industry := "tech"
		result, err := proc.UpdateVoiceProfile(context.Background(), accountID, "professional", "concise", []string{"example post"}, &industry, nil, nil)

		require.NoError(t, err)
		assert.Equal(t, existingID, result.ID)
		assert.Equal(t, "professional", result.Tone)
	})

	t.Run("update error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("update error")
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{ID: uuid.New(), AccountID: aID}, nil
			},
			UpdateVoiceProfileFn: func(ctx context.Context, aID uuid.UUID, params store.UpdateVoiceProfileParams) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.UpdateVoiceProfile(context.Background(), accountID, "casual", "verbose", nil, nil, nil, nil)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_UpdateVoiceProfile_CheckError(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("get profile error propagated when not ErrNotFound", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockSettingsStore{
			GetVoiceProfileByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.VoiceProfile, error) {
				return store.VoiceProfile{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.UpdateVoiceProfile(context.Background(), accountID, "casual", "verbose", nil, nil, nil, nil)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_GetSitePublishTarget(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		targetID := uuid.New()
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{ID: targetID, AccountID: aID, RepoOwner: "acme", RepoName: "blog"}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.GetSitePublishTarget(context.Background(), accountID)

		require.NoError(t, err)
		assert.Equal(t, targetID, result.ID)
		assert.Equal(t, "acme", result.RepoOwner)
		assert.Equal(t, "blog", result.RepoName)
	})

	t.Run("not found returns ErrSitePublishTargetNotFound", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, store.ErrNotFound
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetSitePublishTarget(context.Background(), accountID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrSitePublishTargetNotFound)
	})

	t.Run("other error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetSitePublishTarget(context.Background(), accountID)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_UpdateSitePublishTarget_Create(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("creates new target when none exists", func(t *testing.T) {
		t.Parallel()
		targetID := uuid.New()
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, store.ErrNotFound
			},
			CreateSitePublishTargetFn: func(ctx context.Context, params store.CreateSitePublishTargetParams) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{
					ID:          targetID,
					AccountID:   params.AccountID,
					RepoOwner:   params.RepoOwner,
					RepoName:    params.RepoName,
					BaseBranch:  params.BaseBranch,
					ContentPath: params.ContentPath,
				}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.UpdateSitePublishTarget(context.Background(), accountID, "acme", "blog", "main", "content/posts")

		require.NoError(t, err)
		assert.Equal(t, targetID, result.ID)
		assert.Equal(t, "acme", result.RepoOwner)
		assert.Equal(t, "blog", result.RepoName)
		assert.Equal(t, "main", result.BaseBranch)
		assert.Equal(t, "content/posts", result.ContentPath)
	})

	t.Run("create error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("create error")
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, store.ErrNotFound
			},
			CreateSitePublishTargetFn: func(ctx context.Context, params store.CreateSitePublishTargetParams) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.UpdateSitePublishTarget(context.Background(), accountID, "acme", "blog", "main", "content/posts")

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_UpdateSitePublishTarget_Update(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("updates existing target", func(t *testing.T) {
		t.Parallel()
		existingID := uuid.New()
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{ID: existingID, AccountID: aID, RepoOwner: "old", RepoName: "old"}, nil
			},
			UpdateSitePublishTargetFn: func(ctx context.Context, aID uuid.UUID, params store.UpdateSitePublishTargetParams) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{
					ID:          existingID,
					AccountID:   aID,
					RepoOwner:   *params.RepoOwner,
					RepoName:    *params.RepoName,
					BaseBranch:  *params.BaseBranch,
					ContentPath: *params.ContentPath,
				}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.UpdateSitePublishTarget(context.Background(), accountID, "acme", "blog", "main", "content/posts")

		require.NoError(t, err)
		assert.Equal(t, existingID, result.ID)
		assert.Equal(t, "acme", result.RepoOwner)
		assert.Equal(t, "blog", result.RepoName)
	})

	t.Run("update error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("update error")
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{ID: uuid.New(), AccountID: aID}, nil
			},
			UpdateSitePublishTargetFn: func(ctx context.Context, aID uuid.UUID, params store.UpdateSitePublishTargetParams) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.UpdateSitePublishTarget(context.Background(), accountID, "acme", "blog", "main", "content/posts")

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestSettingsProcessor_UpdateSitePublishTarget_CheckError(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("get target error propagated when not ErrNotFound", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockSettingsStore{
			GetSitePublishTargetByAccountFn: func(ctx context.Context, aID uuid.UUID) (store.SitePublishTarget, error) {
				return store.SitePublishTarget{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.UpdateSitePublishTarget(context.Background(), accountID, "acme", "blog", "main", "content/posts")

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}
