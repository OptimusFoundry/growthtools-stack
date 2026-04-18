package store

import (
	"context"
	"testing"

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
