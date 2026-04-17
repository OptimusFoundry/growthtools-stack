package store

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestGitHubConnection creates a github_connection for the given userID.
// It also seeds an accounts row owned by that user so queries that JOIN
// github_repos → github_connections → accounts (for event attribution) succeed.
func createTestGitHubConnection(t *testing.T, s *Store, userID uuid.UUID) GitHubConnection {
	t.Helper()
	ctx := context.Background()
	_, err := s.CreateAccount(ctx, CreateAccountParams{
		Name:        "acct-" + uuid.New().String()[:8],
		Slug:        "slug-" + uuid.New().String()[:8],
		OwnerUserID: userID,
		Plan:        AccountPlanFree,
	})
	require.NoError(t, err, "createTestGitHubConnection: account seed failed")
	conn, err := s.CreateOrUpdateGitHubConnection(ctx, userID,
		12345+int64(uuid.New().ID()),
		"user-"+uuid.New().String()[:8],
		"token-"+uuid.New().String()[:8],
		"repo,user",
	)
	require.NoError(t, err, "createTestGitHubConnection: failed")
	return conn
}

// createTestGitHubRepo creates a github_repo row under the given connection.
func createTestGitHubRepo(t *testing.T, s *Store, connectionID uuid.UUID) GitHubRepo {
	t.Helper()
	ctx := context.Background()
	owner := "owner-" + uuid.New().String()[:8]
	name := "repo-" + uuid.New().String()[:8]
	repo, err := s.CreateGitHubRepo(ctx, connectionID, 99999, owner, name, strPtr("main"), nil, "secret")
	require.NoError(t, err, "createTestGitHubRepo: failed")
	return repo
}

// ============================================================================
// CreateOrUpdateGitHubConnection (upsert)
// ============================================================================

func TestStore_CreateOrUpdateGitHubConnection(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, int64, string, string, string)
		wantErr bool
		assert  func(t *testing.T, got GitHubConnection)
	}{
		{
			name: "happy path inserts new connection",
			setup: func(t *testing.T) (uuid.UUID, int64, string, string, string) {
				t.Helper()
				userID := createTestUser(t, s)
				return userID, 100001, "octocat", "token-abc", "repo"
			},
			assert: func(t *testing.T, got GitHubConnection) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, "octocat", got.GitHubUsername)
				assert.Nil(t, got.DeletedAt)
			},
		},
		{
			name: "upsert updates existing connection for same user",
			setup: func(t *testing.T) (uuid.UUID, int64, string, string, string) {
				t.Helper()
				userID := createTestUser(t, s)
				// First insert
				_, err := s.CreateOrUpdateGitHubConnection(ctx, userID, 200001, "olduser", "old-token", "repo")
				require.NoError(t, err)
				// Return updated data for the same user
				return userID, 200002, "newuser", "new-token", "repo,user"
			},
			assert: func(t *testing.T, got GitHubConnection) {
				assert.Equal(t, "newuser", got.GitHubUsername)
				assert.Equal(t, "new-token", got.AccessToken)
			},
		},
		{
			name: "FK violation when user does not exist",
			setup: func(t *testing.T) (uuid.UUID, int64, string, string, string) {
				t.Helper()
				return uuid.New(), 300001, "ghost", "token", "repo"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID, ghUID, username, token, scope := tt.setup(t)
			got, err := s.CreateOrUpdateGitHubConnection(ctx, userID, ghUID, username, token, scope)
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
// GetGitHubConnectionByUserID
// ============================================================================

func TestStore_GetGitHubConnectionByUserID(t *testing.T) {
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
			name: "found returns connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				createTestGitHubConnection(t, s, userID)
				return userID
			},
		},
		{
			name: "not found for user with no connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestUser(t, s)
			},
			wantErr: ErrNotFound,
		},
		{
			name: "not found after soft delete",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				createTestGitHubConnection(t, s, userID)
				require.NoError(t, s.SoftDeleteGitHubConnection(ctx, userID))
				return userID
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			got, err := s.GetGitHubConnectionByUserID(ctx, userID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, userID, got.UserID)
		})
	}
}

// ============================================================================
// GetGitHubConnectionByID
// ============================================================================

func TestStore_GetGitHubConnectionByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID) // returns (connectionID, lookupID)
		wantErr error
		assert  func(t *testing.T, got GitHubConnection, connID uuid.UUID)
	}{
		{
			name: "found returns connection with matching fields",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				return conn.ID, conn.ID
			},
			assert: func(t *testing.T, got GitHubConnection, connID uuid.UUID) {
				assert.Equal(t, connID, got.ID)
				assert.Nil(t, got.DeletedAt)
			},
		},
		{
			name: "not found for random uuid",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				return uuid.Nil, uuid.New()
			},
			wantErr: ErrNotFound,
		},
		{
			name: "soft-deleted row is excluded",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				// Soft-delete via userID — this sets deleted_at on the connection row.
				require.NoError(t, s.SoftDeleteGitHubConnection(ctx, userID))
				return conn.ID, conn.ID
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			connID, lookupID := tt.setup(t)
			got, err := s.GetGitHubConnectionByID(ctx, lookupID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got, connID)
			}
		})
	}
}

// ============================================================================
// SoftDeleteGitHubConnection
// ============================================================================

func TestStore_SoftDeleteGitHubConnection(t *testing.T) {
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
			name: "happy path soft deletes connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				createTestGitHubConnection(t, s, userID)
				return userID
			},
		},
		{
			name: "not found for user with no connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return createTestUser(t, s)
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID := tt.setup(t)
			err := s.SoftDeleteGitHubConnection(ctx, userID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			_, err = s.GetGitHubConnectionByUserID(ctx, userID)
			require.ErrorIs(t, err, ErrNotFound)
		})
	}
}

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

// ============================================================================
// InsertGitHubCommit
// ============================================================================

func TestStore_InsertGitHubCommit(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name   string
		setup  func(t *testing.T) (uuid.UUID, string)
		assert func(t *testing.T, got GitHubCommit, isNew bool)
	}{
		{
			name: "happy path inserts new commit returns isNew=true",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				return repo.ID, "sha" + uuid.New().String()[:20]
			},
			assert: func(t *testing.T, got GitHubCommit, isNew bool) {
				assert.True(t, isNew)
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
		{
			name: "duplicate commit returns isNew=false and existing record",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha" + uuid.New().String()[:20]
				// First insert
				_, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					strPtr("Author"), strPtr("a@b.com"), "first commit",
					strPtr("main"), strPtr("https://example.com"),
					time.Now().UTC(), nil)
				require.NoError(t, err)
				return repo.ID, sha
			},
			assert: func(t *testing.T, got GitHubCommit, isNew bool) {
				assert.False(t, isNew)
				assert.NotEqual(t, uuid.Nil, got.ID)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repoID, sha := tt.setup(t)
			payload := json.RawMessage(`{"key":"val"}`)
			got, isNew, err := s.InsertGitHubCommit(ctx, repoID, sha,
				strPtr("Tester"), strPtr("t@t.com"), "test commit",
				strPtr("main"), strPtr("https://example.com"),
				time.Now().UTC(), &payload)
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got, isNew)
			}
		})
	}
}

// ============================================================================
// UpdateGitHubCommitCapture
// ============================================================================

func TestStore_UpdateGitHubCommitCapture(t *testing.T) {
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
			name: "happy path sets capture output",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha"+uuid.New().String()[:20],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				return commit.ID
			},
		},
		{
			name: "not found for unknown commit",
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
			commitID := tt.setup(t)
			err := s.UpdateGitHubCommitCapture(ctx, commitID, json.RawMessage(`{"status":"ok"}`))
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// GetGitHubCommitByRepoSHA
// ============================================================================

func TestStore_GetGitHubCommitByRepoSHA(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, string)
		wantErr error
	}{
		{
			name: "found",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha" + uuid.New().String()[:20]
				_, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha, nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				return repo.ID, sha
			},
		},
		{
			name: "not found for unknown SHA",
			setup: func(t *testing.T) (uuid.UUID, string) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				return repo.ID, "deadbeef00000000000000000000000000000001"
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repoID, sha := tt.setup(t)
			got, err := s.GetGitHubCommitByRepoSHA(ctx, repoID, sha)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, sha, got.SHA)
		})
	}
}

// ============================================================================
// MarkGitHubCommitCaptureRequested
// ============================================================================

func TestStore_MarkGitHubCommitCaptureRequested(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		wantSet bool // whether rows > 0 expected
	}{
		{
			name: "first call marks requested and returns true",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha"+uuid.New().String()[:20],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				return commit.ID
			},
			wantSet: true,
		},
		{
			name: "second call is idempotent and returns false",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha"+uuid.New().String()[:20],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				// First call
				_, err = s.MarkGitHubCommitCaptureRequested(ctx, commit.ID)
				require.NoError(t, err)
				return commit.ID
			},
			wantSet: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			commitID := tt.setup(t)
			got, err := s.MarkGitHubCommitCaptureRequested(ctx, commitID)
			require.NoError(t, err)
			assert.Equal(t, tt.wantSet, got)
		})
	}
}

// ============================================================================
// UpdateGitHubCommitPostID
// ============================================================================

func TestStore_UpdateGitHubCommitPostID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID)
		wantErr error
	}{
		{
			name: "happy path links commit to post",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha"+uuid.New().String()[:20],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				post, err := s.CreatePost(ctx, CreatePostParams{
					AccountID:   accountID,
					Content:     "test post",
					ContentType: ContentTypeText,
					Status:      PostStatusDraft,
					Source:      PostSourceManual,
				})
				require.NoError(t, err)
				return commit.ID, post.ID
			},
		},
		{
			name: "not found for unknown commit",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				return uuid.New(), uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			commitID, postID := tt.setup(t)
			err := s.UpdateGitHubCommitPostID(ctx, commitID, postID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}

// ============================================================================
// ListGitHubCommitsByConnection
// ============================================================================

func TestStore_ListGitHubCommitsByConnection(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID
		limit   int
		offset  int
		wantMin int
	}{
		{
			name: "returns commits for connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				for range 3 {
					_, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha"+uuid.New().String()[:20],
						nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
					require.NoError(t, err)
				}
				return conn.ID
			},
			limit:   10,
			offset:  0,
			wantMin: 3,
		},
		{
			name: "returns empty for connection with no repos",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				return conn.ID
			},
			limit:   10,
			offset:  0,
			wantMin: 0,
		},
		{
			name: "pagination with offset skips rows",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				for range 3 {
					_, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-pg-"+uuid.New().String()[:20],
						nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
					require.NoError(t, err)
				}
				return conn.ID
			},
			limit:   2,
			offset:  2,
			wantMin: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			connID := tt.setup(t)
			got, err := s.ListGitHubCommitsByConnection(ctx, connID, tt.limit, tt.offset)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, len(got), tt.wantMin)
		})
	}
}

// ============================================================================
// CountGitHubCommitsByConnection
// ============================================================================

func TestStore_CountGitHubCommitsByConnection(t *testing.T) {
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
			name: "counts commits across repos under the connection",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				for range 4 {
					_, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-cnt-"+uuid.New().String()[:20],
						nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
					require.NoError(t, err)
				}
				return conn.ID
			},
			wantMin: 4,
		},
		{
			name: "returns 0 when connection has no repos",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				return createTestGitHubConnection(t, s, userID).ID
			},
			wantMin: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			connID := tt.setup(t)
			got, err := s.CountGitHubCommitsByConnection(ctx, connID)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, got, tt.wantMin)
		})
	}
}

// ============================================================================
// GetGitHubCommitForDraft
// ============================================================================

func TestStore_GetGitHubCommitForDraft(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID // returns commitID to look up
		wantErr error
		assert  func(t *testing.T, got GitHubCommitForDraft)
	}{
		{
			name: "happy path returns account_id, repo owner/name, sha, message, branch",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-draft-" + uuid.New().String()[:16]
				branch := "main"
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					strPtr("Author"), strPtr("a@b.com"), "draft commit message",
					&branch, strPtr("https://github.com/example"), time.Now().UTC(), nil)
				require.NoError(t, err)
				return commit.ID
			},
			assert: func(t *testing.T, got GitHubCommitForDraft) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.NotEqual(t, uuid.Nil, got.AccountID)
				assert.NotEmpty(t, got.RepoOwner)
				assert.NotEmpty(t, got.RepoName)
				assert.Equal(t, "draft commit message", got.Message)
				assert.NotNil(t, got.Branch)
				assert.Equal(t, "main", *got.Branch)
				assert.Nil(t, got.PostID)
				assert.Nil(t, got.CaptureOutput)
			},
		},
		{
			name: "happy path returns capture_output and post_id when set",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-cap-" + uuid.New().String()[:16]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "capture msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				// Set capture output
				captureJSON := json.RawMessage(`{"status":"ok","uploaded":[]}`)
				require.NoError(t, s.UpdateGitHubCommitCapture(ctx, commit.ID, captureJSON))
				// Create a post and link it
				accountID := createTestAccount(t, s)
				post, err := s.CreatePost(ctx, CreatePostParams{
					AccountID:   accountID,
					Content:     "linked post",
					ContentType: ContentTypeText,
					Status:      PostStatusDraft,
					Source:      PostSourceManual,
				})
				require.NoError(t, err)
				require.NoError(t, s.UpdateGitHubCommitPostID(ctx, commit.ID, post.ID))
				return commit.ID
			},
			assert: func(t *testing.T, got GitHubCommitForDraft) {
				assert.NotNil(t, got.CaptureOutput)
				assert.NotNil(t, got.PostID)
				assert.NotEqual(t, uuid.Nil, *got.PostID)
			},
		},
		{
			name: "returns ErrNotFound when commit id does not exist",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				return uuid.New()
			},
			wantErr: ErrNotFound,
		},
		{
			name: "returns ErrNotFound when owning connection is soft-deleted",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-delconn-" + uuid.New().String()[:12]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				// Soft-delete the connection (cascades to repos via SoftDeleteGitHubConnection)
				require.NoError(t, s.SoftDeleteGitHubConnection(ctx, userID))
				return commit.ID
			},
			wantErr: ErrNotFound,
		},
		{
			name: "returns ErrNotFound when owning repo is soft-deleted",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-delrepo-" + uuid.New().String()[:12]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				// Soft-delete only the repo, leaving the connection alive
				require.NoError(t, s.SoftDeleteGitHubRepo(ctx, repo.ID))
				return commit.ID
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			commitID := tt.setup(t)
			got, err := s.GetGitHubCommitForDraft(ctx, commitID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
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
// GetGitHubCommitByIDForUser
// ============================================================================

func TestStore_GetGitHubCommitByIDForUser(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (userID, commitID uuid.UUID)
		wantErr error
		assert  func(t *testing.T, commit GitHubCommit)
	}{
		{
			name: "happy path returns commit owned by user",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-owned-"+uuid.New().String()[:16],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				return userID, commit.ID
			},
			assert: func(t *testing.T, commit GitHubCommit) {
				assert.NotEqual(t, uuid.Nil, commit.ID)
				assert.Equal(t, "msg", commit.Message)
			},
		},
		{
			name: "returns ErrNotFound for commit owned by a different user",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				ownerID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, ownerID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-other-"+uuid.New().String()[:16],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				// A different user asks for the same commit id.
				strangerID := createTestUser(t, s)
				return strangerID, commit.ID
			},
			wantErr: ErrNotFound,
		},
		{
			name: "returns ErrNotFound for unknown commit id",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				return createTestUser(t, s), uuid.New()
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			userID, commitID := tt.setup(t)
			got, err := s.GetGitHubCommitByIDForUser(ctx, userID, commitID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assert != nil {
				tt.assert(t, got)
			}
		})
	}
}
