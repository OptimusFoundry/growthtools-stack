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
