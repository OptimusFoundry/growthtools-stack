package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStore_SetPostCaptureMediaIDs(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	t.Run("round-trips through GetPostByID", func(t *testing.T) {
		t.Parallel()
		accountID, postID := createTestPost(t, s)

		before, err := s.GetPostByID(ctx, accountID, postID)
		require.NoError(t, err)
		assert.Empty(t, before.CaptureMediaIDs)

		ids := UUIDArray{uuid.New(), uuid.New()}
		require.NoError(t, s.SetPostCaptureMediaIDs(ctx, postID, ids))

		after, err := s.GetPostByID(ctx, accountID, postID)
		require.NoError(t, err)
		assert.Equal(t, ids, after.CaptureMediaIDs)
	})

	t.Run("unknown post returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		err := s.SetPostCaptureMediaIDs(ctx, uuid.New(), UUIDArray{uuid.New()})
		assert.ErrorIs(t, err, ErrNotFound)
	})
}

func TestStore_GetGitHubCommitForDraftByPostID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	// A commit linked to a post on its owning account.
	userID := createTestUser(t, s)
	conn := createTestGitHubConnection(t, s, userID)
	repo := createTestGitHubRepo(t, s, conn.ID)
	commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, "sha-bypost-"+uuid.New().String()[:16],
		strPtr("Author"), strPtr("a@b.com"), "feat: by post", strPtr("main"),
		strPtr("https://github.com/example"), time.Now().UTC(), nil)
	require.NoError(t, err)
	forDraft, err := s.GetGitHubCommitForDraft(ctx, commit.ID)
	require.NoError(t, err)
	post, err := s.CreatePost(ctx, CreatePostParams{
		AccountID: forDraft.AccountID, Content: "c", ContentType: ContentTypeText,
		Status: PostStatusDraft, MediaIDs: UUIDArray{}, Tags: StringArray{}, Source: "github_event",
	})
	require.NoError(t, err)
	require.NoError(t, s.UpdateGitHubCommitPostID(ctx, commit.ID, post.ID))

	t.Run("finds the commit for its post", func(t *testing.T) {
		t.Parallel()
		got, err := s.GetGitHubCommitForDraftByPostID(ctx, forDraft.AccountID, post.ID)
		require.NoError(t, err)
		assert.Equal(t, commit.ID, got.ID)
		assert.Equal(t, "feat: by post", got.Message)
		assert.Equal(t, repo.Name, got.RepoName)
	})

	t.Run("other account gets ErrNotFound", func(t *testing.T) {
		t.Parallel()
		_, err := s.GetGitHubCommitForDraftByPostID(ctx, uuid.New(), post.ID)
		assert.ErrorIs(t, err, ErrNotFound)
	})

	t.Run("post with no commit gets ErrNotFound", func(t *testing.T) {
		t.Parallel()
		_, err := s.GetGitHubCommitForDraftByPostID(ctx, forDraft.AccountID, uuid.New())
		assert.ErrorIs(t, err, ErrNotFound)
	})
}
