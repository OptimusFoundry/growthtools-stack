package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestPost is a helper that creates an account and a post, returning both IDs.
func createTestPost(t *testing.T, s *Store) (accountID, postID uuid.UUID) {
	t.Helper()
	accountID = createTestAccount(t, s)
	ctx := context.Background()

	post, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "parent post " + uuid.New().String()[:8],
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)
	return accountID, post.ID
}

func TestCreatePlatformPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, postID := createTestPost(t, s)
	ctx := context.Background()

	content := "platform-specific content"
	pp, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   postID,
		Platform: PlatformX,
		Content:  &content,
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, pp.ID)
	assert.Equal(t, postID, pp.PostID)
	assert.Equal(t, PlatformX, pp.Platform)
	assert.Equal(t, PlatformPostStatusPending, pp.Status)
	assert.Equal(t, &content, pp.Content)
}

func TestGetPlatformPostsByPostID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, postID := createTestPost(t, s)
	ctx := context.Background()

	// Create two platform posts for the same post
	for _, platform := range []string{PlatformX, PlatformLinkedIn} {
		_, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID,
			Platform: platform,
		})
		require.NoError(t, err)
	}

	posts, err := s.GetPlatformPostsByPostID(ctx, postID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(posts), 2)

	// Empty for non-existent post
	posts, err = s.GetPlatformPostsByPostID(ctx, uuid.New())
	require.NoError(t, err)
	assert.Empty(t, posts)
}

func TestGetPlatformPostByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, postID := createTestPost(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   postID,
		Platform: PlatformBlueSky,
	})
	require.NoError(t, err)

	got, err := s.GetPlatformPostByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, PlatformBlueSky, got.Platform)

	// Not found
	_, err = s.GetPlatformPostByID(ctx, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestUpdatePlatformPostStatus(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, postID := createTestPost(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   postID,
		Platform: PlatformX,
	})
	require.NoError(t, err)

	platformPostID := "x-post-12345"
	now := time.Now().UTC()
	attemptCount := 1
	err = s.UpdatePlatformPostStatus(ctx, created.ID, PlatformPostStatusPublished, &platformPostID, &now, nil, &attemptCount, nil, &now)
	require.NoError(t, err)

	got, err := s.GetPlatformPostByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, PlatformPostStatusPublished, got.Status)
	assert.Equal(t, &platformPostID, got.PlatformPostID)
	assert.NotNil(t, got.PublishedAt)
	assert.Equal(t, 1, got.AttemptCount)

	// Test error case with retry
	errMsg := "rate limit exceeded"
	attemptCount = 1
	retryAt := time.Now().Add(1 * time.Minute)
	err = s.UpdatePlatformPostStatus(ctx, created.ID, PlatformPostStatusFailed, nil, nil, &errMsg, &attemptCount, &retryAt, &now)
	require.NoError(t, err)

	got, err = s.GetPlatformPostByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, PlatformPostStatusFailed, got.Status)
	assert.Equal(t, &errMsg, got.ErrorMessage)
	assert.NotNil(t, got.NextRetryAt)

	// Not found
	err = s.UpdatePlatformPostStatus(ctx, uuid.New(), PlatformPostStatusPublished, nil, nil, nil, nil, nil, nil)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestUpdatePlatformPostEngagement(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	_, postID := createTestPost(t, s)
	ctx := context.Background()

	created, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
		PostID:   postID,
		Platform: PlatformLinkedIn,
	})
	require.NoError(t, err)

	engagement := JSONB{"likes": float64(42), "comments": float64(5), "shares": float64(3)}
	err = s.UpdatePlatformPostEngagement(ctx, created.ID, engagement)
	require.NoError(t, err)

	got, err := s.GetPlatformPostByID(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, float64(42), got.Engagement["likes"])

	// Not found
	err = s.UpdatePlatformPostEngagement(ctx, uuid.New(), JSONB{"likes": float64(1)})
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestGetPublishedPlatformPostsForAnalytics(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	// Test 1: returns_published_posts_within_window
	t.Run("returns_published_posts_within_window", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)

		postID1, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "post 1 " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		postID2, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "post 2 " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		postID3, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "post 3 " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		postID4, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "post 4 " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		// Create platform posts on X, Threads, BlueSky (should be included)
		pp1, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID1.ID,
			Platform: PlatformX,
		})
		require.NoError(t, err)

		pp2, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID2.ID,
			Platform: PlatformThreads,
		})
		require.NoError(t, err)

		pp3, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID3.ID,
			Platform: PlatformBlueSky,
		})
		require.NoError(t, err)

		// Create platform post on LinkedIn (should be excluded)
		pp4, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID4.ID,
			Platform: PlatformLinkedIn,
		})
		require.NoError(t, err)

		publishedTime := time.Now().Add(-1 * time.Hour)
		platformPostID1 := "x_post_" + uuid.New().String()[:8]
		platformPostID2 := "threads_post_" + uuid.New().String()[:8]
		platformPostID3 := "bluesky_post_" + uuid.New().String()[:8]
		platformPostID4 := "linkedin_post_" + uuid.New().String()[:8]

		// Mark platform posts as published
		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, platform_post_id=$3, published_at=$4, updated_at=NOW() WHERE id=$1`,
			pp1.ID, PlatformPostStatusPublished, platformPostID1, publishedTime,
		)
		require.NoError(t, err)

		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, platform_post_id=$3, published_at=$4, updated_at=NOW() WHERE id=$1`,
			pp2.ID, PlatformPostStatusPublished, platformPostID2, publishedTime,
		)
		require.NoError(t, err)

		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, platform_post_id=$3, published_at=$4, updated_at=NOW() WHERE id=$1`,
			pp3.ID, PlatformPostStatusPublished, platformPostID3, publishedTime,
		)
		require.NoError(t, err)

		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, platform_post_id=$3, published_at=$4, updated_at=NOW() WHERE id=$1`,
			pp4.ID, PlatformPostStatusPublished, platformPostID4, publishedTime,
		)
		require.NoError(t, err)

		cutoff := time.Now().Add(-2 * time.Hour)
		got, err := s.GetPublishedPlatformPostsForAnalytics(ctx, cutoff)

		require.NoError(t, err)
		assert.NotNil(t, got)

		// Filter to only results from this account
		filtered := make([]RetryablePlatformPost, 0)
		for _, p := range got {
			if p.AccountID == accountID {
				filtered = append(filtered, p)
			}
		}

		assert.Equal(t, 3, len(filtered), "should have 3 results (X, Threads, BlueSky but not LinkedIn)")

		platforms := make(map[string]bool)
		for _, p := range filtered {
			platforms[p.Platform] = true
		}
		assert.True(t, platforms[PlatformX], "should include X")
		assert.True(t, platforms[PlatformThreads], "should include Threads")
		assert.True(t, platforms[PlatformBlueSky], "should include BlueSky")
		assert.False(t, platforms[PlatformLinkedIn], "should exclude LinkedIn")
	})

	// Test 2: excludes_posts_older_than_7_days
	t.Run("excludes_posts_older_than_7_days", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)

		postID, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "old post " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		pp, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID.ID,
			Platform: PlatformX,
		})
		require.NoError(t, err)

		// Published 8 days ago
		publishedTime := time.Now().Add(-8 * 24 * time.Hour)
		platformPostID := "old_" + uuid.New().String()[:8]

		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, platform_post_id=$3, published_at=$4, updated_at=NOW() WHERE id=$1`,
			pp.ID, PlatformPostStatusPublished, platformPostID, publishedTime,
		)
		require.NoError(t, err)

		cutoff := time.Now().Add(-7 * 24 * time.Hour)
		got, err := s.GetPublishedPlatformPostsForAnalytics(ctx, cutoff)

		require.NoError(t, err)
		assert.NotNil(t, got)

		// Filter to only results from this account
		filtered := make([]RetryablePlatformPost, 0)
		for _, p := range got {
			if p.AccountID == accountID {
				filtered = append(filtered, p)
			}
		}

		assert.Equal(t, 0, len(filtered), "should exclude posts older than 7 days")
	})

	// Test 3: excludes_null_platform_post_id
	t.Run("excludes_null_platform_post_id", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)

		postID, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "post without platform_post_id " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		pp, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID.ID,
			Platform: PlatformX,
		})
		require.NoError(t, err)

		// Published 3 days ago, but no platform_post_id
		publishedTime := time.Now().Add(-3 * 24 * time.Hour)

		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, published_at=$3, updated_at=NOW() WHERE id=$1`,
			pp.ID, PlatformPostStatusPublished, publishedTime,
		)
		require.NoError(t, err)

		cutoff := time.Now().Add(-4 * 24 * time.Hour)
		got, err := s.GetPublishedPlatformPostsForAnalytics(ctx, cutoff)

		require.NoError(t, err)
		assert.NotNil(t, got)

		// Filter to only results from this account
		filtered := make([]RetryablePlatformPost, 0)
		for _, p := range got {
			if p.AccountID == accountID {
				filtered = append(filtered, p)
			}
		}

		assert.Equal(t, 0, len(filtered), "should exclude posts with NULL platform_post_id")
	})

	// Test 4: excludes_soft_deleted_parent
	t.Run("excludes_soft_deleted_parent", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)

		postID, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "post to delete " + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      PostStatusPublished,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)

		pp, err := s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:   postID.ID,
			Platform: PlatformX,
		})
		require.NoError(t, err)

		publishedTime := time.Now().Add(-3 * 24 * time.Hour)
		platformPostID := "deleted_" + uuid.New().String()[:8]

		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE platform_posts SET status=$2, platform_post_id=$3, published_at=$4, updated_at=NOW() WHERE id=$1`,
			pp.ID, PlatformPostStatusPublished, platformPostID, publishedTime,
		)
		require.NoError(t, err)

		// Soft delete the parent post
		_, err = s.GetDB().ExecContext(ctx,
			`UPDATE posts SET deleted_at=NOW() WHERE id=$1`,
			postID.ID,
		)
		require.NoError(t, err)

		cutoff := time.Now().Add(-4 * 24 * time.Hour)
		got, err := s.GetPublishedPlatformPostsForAnalytics(ctx, cutoff)

		require.NoError(t, err)
		assert.NotNil(t, got)

		// Filter to only results from this account
		filtered := make([]RetryablePlatformPost, 0)
		for _, p := range got {
			if p.AccountID == accountID {
				filtered = append(filtered, p)
			}
		}

		assert.Equal(t, 0, len(filtered), "should exclude posts from deleted parent")
	})

	// Test 5: empty_result_is_non_nil
	t.Run("empty_result_is_non_nil", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)

		cutoff := time.Now().Add(-1 * time.Hour)
		got, err := s.GetPublishedPlatformPostsForAnalytics(ctx, cutoff)

		require.NoError(t, err)
		assert.NotNil(t, got, "result should be non-nil slice")

		// Filter to only results from this account
		filtered := make([]RetryablePlatformPost, 0)
		for _, p := range got {
			if p.AccountID == accountID {
				filtered = append(filtered, p)
			}
		}

		assert.Equal(t, 0, len(filtered), "should be empty for account with no published posts")
	})
}
