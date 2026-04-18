package store

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// CreateGitHubRepo
// ============================================================================

func TestStore_CreateGitHubRepo(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, int64, string, string, *string, *int64, string)
		wantErr bool
		assert  func(t *testing.T, got GitHubRepo)
	}{
		{
			name: "happy path creates repo",
			setup: func(t *testing.T) (uuid.UUID, int64, string, string, *string, *int64, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				return conn.ID, 55555, "myorg", "myrepo-" + uuid.New().String()[:8], strPtr("main"), nil, "sec"
			},
			assert: func(t *testing.T, got GitHubRepo) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.True(t, got.Enabled)
			},
		},
		{
			name: "upsert on duplicate connection+owner+name",
			setup: func(t *testing.T) (uuid.UUID, int64, string, string, *string, *int64, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				owner := "dupowner-" + uuid.New().String()[:8]
				name := "duprepo-" + uuid.New().String()[:8]
				_, err := s.CreateGitHubRepo(ctx, conn.ID, 11111, owner, name, nil, nil, "sec1")
				require.NoError(t, err)
				// Same connection+owner+name triggers upsert (not an error)
				return conn.ID, 22222, owner, name, strPtr("dev"), nil, "sec2"
			},
			assert: func(t *testing.T, got GitHubRepo) {
				assert.EqualValues(t, 22222, got.GitHubRepoID)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			connID, ghRepoID, owner, name, branch, webhookID, secret := tt.setup(t)
			got, err := s.CreateGitHubRepo(ctx, connID, ghRepoID, owner, name, branch, webhookID, secret)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}

// ============================================================================
// ListGitHubReposByConnection
// ============================================================================

func TestStore_ListGitHubReposByConnection(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantMin int
	}{
		{
			name: "returns repos for connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				createTestGitHubRepo(t, s, conn.ID)
				createTestGitHubRepo(t, s, conn.ID)
				return conn.ID
			},
			wantMin: 2,
		},
		{
			name: "returns empty for connection with no repos",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				return conn.ID
			},
			wantMin: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			connID := tt.setup(t)
			got, err := s.ListGitHubReposByConnection(ctx, connID)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(got), tt.wantMin)
		})
	}
}

// ============================================================================
// GetGitHubRepoByConnectionAndName
// ============================================================================

func TestStore_GetGitHubRepoByConnectionAndName(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, string, string)
		wantErr error
	}{
		{
			name: "found",
			setup: func(t *testing.T) (uuid.UUID, string, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				owner := "theowner-" + uuid.New().String()[:8]
				name := "therepo-" + uuid.New().String()[:8]
				_, err := s.CreateGitHubRepo(ctx, conn.ID, 77777, owner, name, nil, nil, "sec")
				require.NoError(t, err)
				return conn.ID, owner, name
			},
		},
		{
			name: "not found for unknown name",
			setup: func(t *testing.T) (uuid.UUID, string, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				return conn.ID, "nobody", "norepo"
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			connID, owner, name := tt.setup(t)
			got, err := s.GetGitHubRepoByConnectionAndName(ctx, connID, owner, name)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, owner, got.Owner)
			assert.Equal(t, name, got.Name)
		})
	}
}

// ============================================================================
// GetGitHubRepoByGitHubID
// ============================================================================

func TestStore_GetGitHubRepoByGitHubID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) int64
		wantErr error
	}{
		{
			name: "found",
			setup: func(t *testing.T) int64 {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				ghRepoID := int64(88888 + uuid.New().ID()%10000)
				_, err := s.CreateGitHubRepo(ctx, conn.ID, ghRepoID,
					"org-"+uuid.New().String()[:6], "repo-"+uuid.New().String()[:6], nil, nil, "sec")
				require.NoError(t, err)
				return ghRepoID
			},
		},
		{
			name: "not found for unknown github repo ID",
			setup: func(t *testing.T) int64 {
				t.Helper()
				return -999
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ghRepoID := tt.setup(t)
			got, err := s.GetGitHubRepoByGitHubID(ctx, ghRepoID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, ghRepoID, got.GitHubRepoID)
		})
	}
}

// ============================================================================
// GetGitHubRepoByOwnerName
// ============================================================================

func TestStore_GetGitHubRepoByOwnerName(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (string, string)
		wantErr error
	}{
		{
			name: "found",
			setup: func(t *testing.T) (string, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				owner := "ownername-" + uuid.New().String()[:8]
				repoName := "reponame-" + uuid.New().String()[:8]
				_, err := s.CreateGitHubRepo(ctx, conn.ID, 11111, owner, repoName, nil, nil, "sec")
				require.NoError(t, err)
				return owner, repoName
			},
		},
		{
			name: "not found for unknown owner/name",
			setup: func(t *testing.T) (string, string) {
				t.Helper()
				return "no-owner-" + uuid.New().String()[:8], "no-repo-" + uuid.New().String()[:8]
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			owner, name := tt.setup(t)
			got, err := s.GetGitHubRepoByOwnerName(ctx, owner, name)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, owner, got.Owner)
			assert.Equal(t, name, got.Name)
		})
	}
}

// ============================================================================
// UpdateGitHubRepoID
// ============================================================================

func TestStore_UpdateGitHubRepoID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, int64)
		wantErr error
	}{
		{
			name: "happy path updates github repo ID",
			setup: func(t *testing.T) (uuid.UUID, int64) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				return repo.ID, 999999
			},
		},
		{
			name: "not found for unknown repo",
			setup: func(t *testing.T) (uuid.UUID, int64) {
				t.Helper()
				return uuid.New(), 111111
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repoID, ghRepoID := tt.setup(t)
			err := s.UpdateGitHubRepoID(ctx, repoID, ghRepoID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// SoftDeleteGitHubRepo
// ============================================================================

func TestStore_SoftDeleteGitHubRepo(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantErr error
	}{
		{
			name: "happy path soft deletes repo",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				return createTestGitHubRepo(t, s, conn.ID).ID
			},
		},
		{
			name: "not found for already deleted repo",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				require.NoError(t, s.SoftDeleteGitHubRepo(ctx, repo.ID))
				return repo.ID
			},
			wantErr: ErrNotFound,
		},
		{
			name: "not found for unknown repo",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repoID := tt.setup(t)
			err := s.SoftDeleteGitHubRepo(ctx, repoID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}
