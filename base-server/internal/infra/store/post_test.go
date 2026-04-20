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

func TestCreatePost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	title := "My First Post"
	post, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Title:       &title,
		Content:     "Hello world content",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Tags:        StringArray{"go", "testing"},
		AIGenerated: false,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, post.ID)
	assert.Equal(t, accountID, post.AccountID)
	assert.Equal(t, &title, post.Title)
	assert.Equal(t, "Hello world content", post.Content)
	assert.Equal(t, ContentTypeText, post.ContentType)
	assert.Equal(t, PostStatusDraft, post.Status)
	assert.False(t, post.AIGenerated)
	assert.Equal(t, PostSourceManual, post.Source)
	assert.Nil(t, post.DeletedAt)
}

func TestGetPostByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "Test content",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	// Happy path
	got, err := s.GetPostByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, created.Content, got.Content)

	// Not found - wrong ID
	_, err = s.GetPostByID(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)

	// Not found - wrong account
	_, err = s.GetPostByID(ctx, uuid.New(), created.ID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestListPosts(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// Create posts with different statuses
	for _, status := range []string{PostStatusDraft, PostStatusDraft, PostStatusScheduled} {
		_, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "content-" + status + "-" + uuid.New().String()[:8],
			ContentType: ContentTypeText,
			Status:      status,
			Source:      PostSourceManual,
		})
		require.NoError(t, err)
	}

	// List all
	posts, err := s.ListPosts(ctx, ListPostsParams{
		AccountID: accountID,
		Limit:     10,
	})
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(posts), 3)

	// Filter by status
	draftStatus := PostStatusDraft
	drafts, err := s.ListPosts(ctx, ListPostsParams{
		AccountID: accountID,
		Status:    &draftStatus,
		Limit:     10,
	})
	require.NoError(t, err)
	for _, p := range drafts {
		assert.Equal(t, PostStatusDraft, p.Status)
	}

	// Empty result for different account
	otherAccount := createTestAccount(t, s)
	posts, err = s.ListPosts(ctx, ListPostsParams{AccountID: otherAccount, Limit: 10})
	require.NoError(t, err)
	assert.Empty(t, posts)
}

func TestListPosts_TitleFallback(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	// 1. Post with an explicit title — preserved verbatim.
	explicit := "Explicit Title"
	_, err := s.CreatePost(ctx, CreatePostParams{
		AccountID: accountID, Title: &explicit,
		Content: "body goes here", ContentType: ContentTypeText,
		Status: PostStatusDraft, Source: PostSourceManual,
	})
	require.NoError(t, err)

	// 2. Post with NULL title + base_content — list should derive from base_content.
	baseIdea := "Ship the new onboarding flow today and announce it"
	_, err = s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "Generated social copy for the launch.",
		BaseContent: &baseIdea,
		ContentType: ContentTypeText, Status: PostStatusDraft, Source: PostSourceManual,
	})
	require.NoError(t, err)

	// 3. Post with NULL title AND no base_content — falls back to content.
	contentOnly := "Just shipped a tiny fix for the calendar view bug that everyone hated."
	_, err = s.CreatePost(ctx, CreatePostParams{
		AccountID: accountID,
		Content:   contentOnly, ContentType: ContentTypeText,
		Status: PostStatusDraft, Source: PostSourceManual,
	})
	require.NoError(t, err)

	posts, err := s.ListPosts(ctx, ListPostsParams{AccountID: accountID, Limit: 10})
	require.NoError(t, err)
	require.Len(t, posts, 3)

	// Ordered DESC by created_at — newest first = contentOnly, then baseIdea, then explicit.
	require.NotNil(t, posts[0].Title)
	assert.Equal(t, contentOnly[:50], *posts[0].Title)

	require.NotNil(t, posts[1].Title)
	assert.Equal(t, baseIdea[:50], *posts[1].Title)

	require.NotNil(t, posts[2].Title)
	assert.Equal(t, explicit, *posts[2].Title)
}

func TestUpdatePost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "original content",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	newContent := "updated content"
	newStatus := PostStatusScheduled
	updated, err := s.UpdatePost(ctx, accountID, created.ID, UpdatePostParams{
		Content: &newContent,
		Status:  &newStatus,
	})
	require.NoError(t, err)
	assert.Equal(t, "updated content", updated.Content)
	assert.Equal(t, PostStatusScheduled, updated.Status)

	// Not found
	_, err = s.UpdatePost(ctx, accountID, uuid.New(), UpdatePostParams{Content: &newContent})
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestDeletePost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "to be deleted",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	// Soft delete
	err = s.DeletePost(ctx, accountID, created.ID)
	require.NoError(t, err)

	// Should not be found after delete
	_, err = s.GetPostByID(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Double delete returns not found
	err = s.DeletePost(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Delete non-existent
	err = s.DeletePost(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestUpdatePostStatus(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "status test",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	now := time.Now().UTC()
	err = s.UpdatePostStatus(ctx, accountID, created.ID, PostStatusPublished, &now)
	require.NoError(t, err)

	got, err := s.GetPostByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, PostStatusPublished, got.Status)
	assert.NotNil(t, got.PublishedAt)

	// Not found
	err = s.UpdatePostStatus(ctx, accountID, uuid.New(), PostStatusPublished, &now)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestGetDueScheduledPosts(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	pastTime := time.Now().UTC().Add(-1 * time.Hour)
	futureTime := time.Now().UTC().Add(1 * time.Hour)

	// Create a past scheduled post
	_, err := s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "due post " + uuid.New().String()[:8],
		ContentType: ContentTypeText,
		Status:      PostStatusScheduled,
		ScheduledAt: &pastTime,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	// Create a future scheduled post
	_, err = s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "future post " + uuid.New().String()[:8],
		ContentType: ContentTypeText,
		Status:      PostStatusScheduled,
		ScheduledAt: &futureTime,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	duePosts, err := s.GetDueScheduledPosts(ctx, time.Now().UTC())
	require.NoError(t, err)
	// At least the past post should be due
	assert.GreaterOrEqual(t, len(duePosts), 1)
	for _, p := range duePosts {
		assert.Equal(t, PostStatusScheduled, p.Status)
		assert.True(t, p.ScheduledAt.Before(time.Now().UTC()) || p.ScheduledAt.Equal(time.Now().UTC()))
	}
}

func TestCountPostsByAccount(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	count, err := s.CountPostsByAccount(ctx, accountID)
	require.NoError(t, err)
	assert.Equal(t, 0, count)

	_, err = s.CreatePost(ctx, CreatePostParams{
		AccountID:   accountID,
		Content:     "count test",
		ContentType: ContentTypeText,
		Status:      PostStatusDraft,
		Source:      PostSourceManual,
	})
	require.NoError(t, err)

	count, err = s.CountPostsByAccount(ctx, accountID)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestUnlinkMediaFromPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	// Helper that materializes a post with three media attachments and one
	// platform_post whose thread_segments reference each slot by 1-based
	// image_index. Returns account, post id, and the three media ids in
	// attachment order.
	seed := func(t *testing.T) (uuid.UUID, uuid.UUID, []uuid.UUID) {
		t.Helper()
		accountID := createTestAccount(t, s)

		mediaIDs := make([]uuid.UUID, 0, 3)
		for i := 0; i < 3; i++ {
			m, err := s.CreateMedia(ctx, CreateMediaParams{
				AccountID:   accountID,
				Filename:    "m.png",
				ContentType: "image/png",
				S3Key:       "k/" + uuid.New().String(),
				S3URL:       "s3://b/k",
				SizeBytes:   10,
				Source:      MediaSourceUpload,
			})
			require.NoError(t, err)
			mediaIDs = append(mediaIDs, m.ID)
		}

		post, err := s.CreatePost(ctx, CreatePostParams{
			AccountID:   accountID,
			Content:     "body",
			ContentType: ContentTypeThread,
			Status:      PostStatusDraft,
			Source:      PostSourceManual,
			MediaIDs:    UUIDArray(mediaIDs),
		})
		require.NoError(t, err)

		segs := json.RawMessage(`[{"content":"first","image_index":1},{"content":"second","image_index":2},{"content":"third","image_index":3},{"content":"closer"}]`)
		_, err = s.CreatePlatformPost(ctx, CreatePlatformPostParams{
			PostID:         post.ID,
			Platform:       "x",
			Content:        strPtr("first\nsecond\nthird\ncloser"),
			ThreadSegments: &segs,
		})
		require.NoError(t, err)

		return accountID, post.ID, mediaIDs
	}

	t.Run("removes middle media and renumbers higher indexes", func(t *testing.T) {
		t.Parallel()
		accountID, postID, mediaIDs := seed(t)

		require.NoError(t, s.UnlinkMediaFromPost(ctx, accountID, postID, mediaIDs[1]))

		post, err := s.GetPostByID(ctx, accountID, postID)
		require.NoError(t, err)
		require.Len(t, post.MediaIDs, 2)
		assert.Equal(t, mediaIDs[0], post.MediaIDs[0])
		assert.Equal(t, mediaIDs[2], post.MediaIDs[1])

		pps, err := s.GetPlatformPostsByPostID(ctx, postID)
		require.NoError(t, err)
		require.Len(t, pps, 1)
		require.NotNil(t, pps[0].ThreadSegments)
		var segs []map[string]any
		require.NoError(t, json.Unmarshal(*pps[0].ThreadSegments, &segs))
		require.Len(t, segs, 4)
		// Slot 1 untouched.
		assert.EqualValues(t, 1, segs[0]["image_index"])
		// Slot that pointed at the removed index loses image_index.
		_, hasIdx := segs[1]["image_index"]
		assert.False(t, hasIdx, "expected image_index cleared for removed slot")
		// Slot 3 → 2 after renumber.
		assert.EqualValues(t, 2, segs[2]["image_index"])
		// Slot without image_index stays clean.
		_, hasIdx = segs[3]["image_index"]
		assert.False(t, hasIdx)
	})

	t.Run("removes first media and shifts every higher index down", func(t *testing.T) {
		t.Parallel()
		accountID, postID, mediaIDs := seed(t)

		require.NoError(t, s.UnlinkMediaFromPost(ctx, accountID, postID, mediaIDs[0]))

		pps, err := s.GetPlatformPostsByPostID(ctx, postID)
		require.NoError(t, err)
		var segs []map[string]any
		require.NoError(t, json.Unmarshal(*pps[0].ThreadSegments, &segs))
		// First segment pointed at removed slot → cleared.
		_, hasIdx := segs[0]["image_index"]
		assert.False(t, hasIdx)
		// Subsequent indexes shift: 2→1, 3→2.
		assert.EqualValues(t, 1, segs[1]["image_index"])
		assert.EqualValues(t, 2, segs[2]["image_index"])
	})

	t.Run("post not found returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)
		err := s.UnlinkMediaFromPost(ctx, accountID, uuid.New(), uuid.New())
		require.ErrorIs(t, err, ErrNotFound)
	})

	t.Run("wrong account returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		_, postID, mediaIDs := seed(t)
		otherAccount := createTestAccount(t, s)
		err := s.UnlinkMediaFromPost(ctx, otherAccount, postID, mediaIDs[0])
		require.ErrorIs(t, err, ErrNotFound)
	})

	t.Run("media not attached to post returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		accountID, postID, _ := seed(t)
		err := s.UnlinkMediaFromPost(ctx, accountID, postID, uuid.New())
		require.ErrorIs(t, err, ErrNotFound)
	})

	t.Run("post with no platform posts still updates media_ids cleanly", func(t *testing.T) {
		t.Parallel()
		accountID := createTestAccount(t, s)
		m, err := s.CreateMedia(ctx, CreateMediaParams{
			AccountID: accountID, Filename: "m.png", ContentType: "image/png",
			S3Key: "k/" + uuid.New().String(), S3URL: "s3://b/k",
			SizeBytes: 1, Source: MediaSourceUpload,
		})
		require.NoError(t, err)
		post, err := s.CreatePost(ctx, CreatePostParams{
			AccountID: accountID, Content: "x", ContentType: ContentTypeText,
			Status: PostStatusDraft, Source: PostSourceManual,
			MediaIDs: UUIDArray{m.ID},
		})
		require.NoError(t, err)

		require.NoError(t, s.UnlinkMediaFromPost(ctx, accountID, post.ID, m.ID))

		got, err := s.GetPostByID(ctx, accountID, post.ID)
		require.NoError(t, err)
		assert.Empty(t, got.MediaIDs)
	})
}

// Assert that rewriteSegmentsAfterUnlink handles edge cases that would be a
// pain to exercise through the DB (malformed inputs, non-numeric indexes).
func TestRewriteSegmentsAfterUnlink(t *testing.T) {
	t.Parallel()

	t.Run("invalid json surfaces an error", func(t *testing.T) {
		t.Parallel()
		_, err := rewriteSegmentsAfterUnlink(json.RawMessage("not json"), 1)
		require.Error(t, err)
	})

	t.Run("non-numeric image_index is left alone", func(t *testing.T) {
		t.Parallel()
		in := json.RawMessage(`[{"content":"a","image_index":"nope"}]`)
		out, err := rewriteSegmentsAfterUnlink(in, 1)
		require.NoError(t, err)
		var segs []map[string]any
		require.NoError(t, json.Unmarshal(out, &segs))
		assert.Equal(t, "nope", segs[0]["image_index"])
	})

	t.Run("null image_index is a no-op", func(t *testing.T) {
		t.Parallel()
		in := json.RawMessage(`[{"content":"a","image_index":null}]`)
		out, err := rewriteSegmentsAfterUnlink(in, 1)
		require.NoError(t, err)
		var segs []map[string]any
		require.NoError(t, json.Unmarshal(out, &segs))
		// Explicit null stays; nothing to renumber.
		_, hasKey := segs[0]["image_index"]
		assert.True(t, hasKey)
	})
}
