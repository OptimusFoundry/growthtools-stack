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

// ============================================================================
// GetGitHubCommitForBlog
// ============================================================================

func TestStore_GetGitHubCommitForBlog(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) uuid.UUID // returns commitID
		wantErr error
		assert  func(t *testing.T, got GitHubCommitForBlog)
	}{
		{
			name: "happy path returns access_token, account_id, repo owner/name, sha, message",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-blog-" + uuid.New().String()[:16]
				branch := "main"
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					strPtr("Author"), strPtr("a@b.com"), "blog commit message",
					&branch, strPtr("https://github.com/example"), time.Now().UTC(), nil)
				require.NoError(t, err)
				return commit.ID
			},
			assert: func(t *testing.T, got GitHubCommitForBlog) {
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.NotEqual(t, uuid.Nil, got.AccountID)
				assert.NotEmpty(t, got.RepoOwner)
				assert.NotEmpty(t, got.RepoName)
				assert.NotEmpty(t, got.ConnectionAccessToken)
				assert.Equal(t, "blog commit message", got.Message)
				assert.NotNil(t, got.Branch)
				assert.Equal(t, "main", *got.Branch)
				assert.Nil(t, got.BlogPostID)
				assert.Nil(t, got.CaptureOutput)
			},
		},
		{
			name: "happy path returns capture_output and blog_post_id when set",
			setup: func(t *testing.T) uuid.UUID {
				t.Helper()
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				sha := "sha-blog-cap-" + uuid.New().String()[:12]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "capture msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				captureJSON := json.RawMessage(`{"uploaded":[{"key":"a.png"}]}`)
				require.NoError(t, s.UpdateGitHubCommitCapture(ctx, commit.ID, captureJSON))

				accountID := createTestAccount(t, s)
				bp, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
					AccountID: accountID,
					Title:     "Linked Blog",
					Slug:      "linked-" + uuid.New().String()[:8],
					Content:   "# linked",
					Status:    BlogStatusDraft,
					Keywords:  StringArray{},
				})
				require.NoError(t, err)
				require.NoError(t, s.UpdateGitHubCommitBlogPostID(ctx, commit.ID, bp.ID))
				return commit.ID
			},
			assert: func(t *testing.T, got GitHubCommitForBlog) {
				assert.NotNil(t, got.CaptureOutput)
				require.NotNil(t, got.BlogPostID)
				assert.NotEqual(t, uuid.Nil, *got.BlogPostID)
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
				sha := "sha-blog-delconn-" + uuid.New().String()[:10]
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha,
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				require.NoError(t, s.SoftDeleteGitHubConnection(ctx, userID))
				_ = conn
				return commit.ID
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			commitID := tt.setup(t)
			got, err := s.GetGitHubCommitForBlog(ctx, commitID)
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
// UpdateGitHubCommitBlogPostID
// ============================================================================

func TestStore_UpdateGitHubCommitBlogPostID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		setup   func(t *testing.T) (uuid.UUID, uuid.UUID) // commitID, blogPostID
		wantErr error
	}{
		{
			name: "happy path links commit to blog post",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID) {
				t.Helper()
				accountID := createTestAccount(t, s)
				userID := createTestUser(t, s)
				conn := createTestGitHubConnection(t, s, userID)
				repo := createTestGitHubRepo(t, s, conn.ID)
				commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-b-"+uuid.New().String()[:16],
					nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
				require.NoError(t, err)
				bp, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
					AccountID: accountID,
					Title:     "T",
					Slug:      "t-" + uuid.New().String()[:8],
					Content:   "# t",
					Status:    BlogStatusDraft,
					Keywords:  StringArray{},
				})
				require.NoError(t, err)
				return commit.ID, bp.ID
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
			commitID, blogPostID := tt.setup(t)
			err := s.UpdateGitHubCommitBlogPostID(ctx, commitID, blogPostID)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}
