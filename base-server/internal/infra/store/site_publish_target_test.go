package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// CreateSitePublishTarget
// ============================================================================

func TestStore_CreateSitePublishTarget(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) CreateSitePublishTargetParams
		wantErr bool
	}{
		{
			name: "happy path creates site publish target",
			setup: func(t *testing.T) CreateSitePublishTargetParams {
				t.Helper()
				accountID := createTestAccount(t, s)
				return CreateSitePublishTargetParams{
					AccountID:   accountID,
					RepoOwner:   "acme-" + uuid.New().String()[:8],
					RepoName:    "site",
					BaseBranch:  "main",
					ContentPath: "content/blog",
				}
			},
		},
		{
			name: "duplicate account_id violates unique constraint",
			setup: func(t *testing.T) CreateSitePublishTargetParams {
				t.Helper()
				accountID := createTestAccount(t, s)
				_, err := s.CreateSitePublishTarget(ctx, CreateSitePublishTargetParams{
					AccountID:   accountID,
					RepoOwner:   "acme-first-" + uuid.New().String()[:8],
					RepoName:    "site",
					BaseBranch:  "main",
					ContentPath: "content/blog",
				})
				require.NoError(t, err)
				return CreateSitePublishTargetParams{
					AccountID:   accountID,
					RepoOwner:   "acme-second-" + uuid.New().String()[:8],
					RepoName:    "site",
					BaseBranch:  "main",
					ContentPath: "content/blog",
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			params := tt.setup(t)
			got, err := s.CreateSitePublishTarget(ctx, params)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.NotEqual(t, uuid.Nil, got.ID)
			assert.Equal(t, params.AccountID, got.AccountID)
			assert.Equal(t, params.RepoOwner, got.RepoOwner)
			assert.Equal(t, params.RepoName, got.RepoName)
			assert.Equal(t, params.BaseBranch, got.BaseBranch)
			assert.Equal(t, params.ContentPath, got.ContentPath)
			assert.False(t, got.CreatedAt.IsZero())
			assert.False(t, got.UpdatedAt.IsZero())
		})
	}
}

// ============================================================================
// GetSitePublishTargetByAccount
// ============================================================================

func TestStore_GetSitePublishTargetByAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (accountID uuid.UUID, want *SitePublishTarget)
		wantErr error
	}{
		{
			name: "found",
			setup: func(t *testing.T) (uuid.UUID, *SitePublishTarget) {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateSitePublishTarget(ctx, CreateSitePublishTargetParams{
					AccountID:   accountID,
					RepoOwner:   "acme-" + uuid.New().String()[:8],
					RepoName:    "site",
					BaseBranch:  "main",
					ContentPath: "content/blog",
				})
				require.NoError(t, err)
				return accountID, &created
			},
		},
		{
			name: "not found for account with no target",
			setup: func(t *testing.T) (uuid.UUID, *SitePublishTarget) {
				t.Helper()
				return uuid.New(), nil
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, want := tt.setup(t)
			got, err := s.GetSitePublishTargetByAccount(ctx, accountID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, want)
			assert.Equal(t, want.ID, got.ID)
			assert.Equal(t, want.AccountID, got.AccountID)
			assert.Equal(t, want.RepoOwner, got.RepoOwner)
		})
	}
}

// ============================================================================
// UpdateSitePublishTarget
// ============================================================================

func TestStore_UpdateSitePublishTarget(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name     string
		setup    func(t *testing.T) (accountID uuid.UUID, params UpdateSitePublishTargetParams)
		wantErr  error
		assertFn func(t *testing.T, got SitePublishTarget)
	}{
		{
			name: "happy path updates all four fields",
			setup: func(t *testing.T) (uuid.UUID, UpdateSitePublishTargetParams) {
				t.Helper()
				accountID := createTestAccount(t, s)
				_, err := s.CreateSitePublishTarget(ctx, CreateSitePublishTargetParams{
					AccountID:   accountID,
					RepoOwner:   "original-owner",
					RepoName:    "original-repo",
					BaseBranch:  "main",
					ContentPath: "content/blog",
				})
				require.NoError(t, err)
				return accountID, UpdateSitePublishTargetParams{
					RepoOwner:   strPtr("updated-owner"),
					RepoName:    strPtr("updated-repo"),
					BaseBranch:  strPtr("develop"),
					ContentPath: strPtr("content/posts"),
				}
			},
			assertFn: func(t *testing.T, got SitePublishTarget) {
				t.Helper()
				assert.Equal(t, "updated-owner", got.RepoOwner)
				assert.Equal(t, "updated-repo", got.RepoName)
				assert.Equal(t, "develop", got.BaseBranch)
				assert.Equal(t, "content/posts", got.ContentPath)
				assert.WithinDuration(t, time.Now(), got.UpdatedAt, 10*time.Second)
			},
		},
		{
			name: "partial update leaves other fields unchanged via COALESCE",
			setup: func(t *testing.T) (uuid.UUID, UpdateSitePublishTargetParams) {
				t.Helper()
				accountID := createTestAccount(t, s)
				_, err := s.CreateSitePublishTarget(ctx, CreateSitePublishTargetParams{
					AccountID:   accountID,
					RepoOwner:   "keep-owner",
					RepoName:    "keep-repo",
					BaseBranch:  "main",
					ContentPath: "content/blog",
				})
				require.NoError(t, err)
				return accountID, UpdateSitePublishTargetParams{
					BaseBranch: strPtr("release"),
				}
			},
			assertFn: func(t *testing.T, got SitePublishTarget) {
				t.Helper()
				assert.Equal(t, "keep-owner", got.RepoOwner)
				assert.Equal(t, "keep-repo", got.RepoName)
				assert.Equal(t, "release", got.BaseBranch)
				assert.Equal(t, "content/blog", got.ContentPath)
			},
		},
		{
			name: "not found for account with no target",
			setup: func(t *testing.T) (uuid.UUID, UpdateSitePublishTargetParams) {
				t.Helper()
				return uuid.New(), UpdateSitePublishTargetParams{RepoOwner: strPtr("x")}
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, params := tt.setup(t)
			got, err := s.UpdateSitePublishTarget(ctx, accountID, params)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertFn != nil {
				tt.assertFn(t, got)
			}
		})
	}
}
