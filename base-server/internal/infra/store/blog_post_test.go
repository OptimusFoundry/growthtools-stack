package store

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateBlogPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	excerpt := "A short excerpt"
	seoTitle := "SEO Title"
	metaDesc := "Meta description for search"

	bp, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
		AccountID:       accountID,
		Title:           "My Blog Post",
		Slug:            "my-blog-post-" + uuid.New().String()[:8],
		Content:         "# Hello\n\nThis is a blog post.",
		Excerpt:         &excerpt,
		Status:          BlogStatusDraft,
		SEOTitle:        &seoTitle,
		MetaDescription: &metaDesc,
		Keywords:        StringArray{"go", "testing", "blog"},
	})
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, bp.ID)
	assert.Equal(t, accountID, bp.AccountID)
	assert.Equal(t, "My Blog Post", bp.Title)
	assert.Equal(t, BlogStatusDraft, bp.Status)
	assert.Equal(t, &excerpt, bp.Excerpt)
	assert.Equal(t, &seoTitle, bp.SEOTitle)
	assert.Equal(t, &metaDesc, bp.MetaDescription)
	assert.Nil(t, bp.PublishedAt)
	assert.Nil(t, bp.DeletedAt)
}

func TestGetBlogPostByID(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
		AccountID: accountID,
		Title:     "Get By ID Test",
		Slug:      "get-by-id-" + uuid.New().String()[:8],
		Content:   "Content here",
		Status:    BlogStatusDraft,
	})
	require.NoError(t, err)

	got, err := s.GetBlogPostByID(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, "Get By ID Test", got.Title)

	// Not found
	_, err = s.GetBlogPostByID(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)

	// Wrong account
	_, err = s.GetBlogPostByID(ctx, uuid.New(), created.ID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestGetBlogPostBySlug(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	slug := "unique-slug-" + uuid.New().String()[:8]
	created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
		AccountID: accountID,
		Title:     "Slug Test",
		Slug:      slug,
		Content:   "Content",
		Status:    BlogStatusDraft,
	})
	require.NoError(t, err)

	got, err := s.GetBlogPostBySlug(ctx, accountID, slug)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, slug, got.Slug)

	// Not found
	_, err = s.GetBlogPostBySlug(ctx, accountID, "nonexistent-slug")
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestListBlogPosts(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	for i, status := range []string{BlogStatusDraft, BlogStatusDraft, BlogStatusPublished} {
		_, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
			AccountID: accountID,
			Title:     "List Test " + uuid.New().String()[:8],
			Slug:      "list-test-" + uuid.New().String()[:8],
			Content:   "Content " + string(rune('A'+i)),
			Status:    status,
		})
		require.NoError(t, err)
	}

	// List all
	posts, err := s.ListBlogPosts(ctx, accountID, nil, 10, 0)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(posts), 3)

	// Filter by status
	draftStatus := BlogStatusDraft
	drafts, err := s.ListBlogPosts(ctx, accountID, &draftStatus, 10, 0)
	require.NoError(t, err)
	for _, p := range drafts {
		assert.Equal(t, BlogStatusDraft, p.Status)
	}

	// Empty for other account
	other := createTestAccount(t, s)
	posts, err = s.ListBlogPosts(ctx, other, nil, 10, 0)
	require.NoError(t, err)
	assert.Empty(t, posts)
}

func TestUpdateBlogPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
		AccountID: accountID,
		Title:     "Original Title",
		Slug:      "original-slug-" + uuid.New().String()[:8],
		Content:   "Original content",
		Status:    BlogStatusDraft,
	})
	require.NoError(t, err)

	newTitle := "Updated Title"
	newContent := "Updated content"
	updated, err := s.UpdateBlogPost(ctx, accountID, created.ID, UpdateBlogPostParams{
		Title:   &newTitle,
		Content: &newContent,
	})
	require.NoError(t, err)
	assert.Equal(t, "Updated Title", updated.Title)
	assert.Equal(t, "Updated content", updated.Content)
	// Slug should remain unchanged
	assert.Equal(t, created.Slug, updated.Slug)

	// Not found
	_, err = s.UpdateBlogPost(ctx, accountID, uuid.New(), UpdateBlogPostParams{Title: &newTitle})
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestDeleteBlogPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
		AccountID: accountID,
		Title:     "Delete Test",
		Slug:      "delete-test-" + uuid.New().String()[:8],
		Content:   "To be deleted",
		Status:    BlogStatusDraft,
	})
	require.NoError(t, err)

	err = s.DeleteBlogPost(ctx, accountID, created.ID)
	require.NoError(t, err)

	// Should not be found
	_, err = s.GetBlogPostByID(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)

	// Double delete
	err = s.DeleteBlogPost(ctx, accountID, created.ID)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestPublishBlogPost(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	accountID := createTestAccount(t, s)
	ctx := context.Background()

	created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
		AccountID: accountID,
		Title:     "Publish Test",
		Slug:      "publish-test-" + uuid.New().String()[:8],
		Content:   "Ready to publish",
		Status:    BlogStatusDraft,
	})
	require.NoError(t, err)
	assert.Nil(t, created.PublishedAt)

	published, err := s.PublishBlogPost(ctx, accountID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, BlogStatusPublished, published.Status)
	assert.NotNil(t, published.PublishedAt)

	// Not found
	_, err = s.PublishBlogPost(ctx, accountID, uuid.New())
	assert.ErrorIs(t, err, ErrNotFound)
}

// ============================================================================
// SetBlogPostSitePR
// ============================================================================

func TestStore_SetBlogPostSitePR(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skip("skipping store test in short mode")
	}

	s := SetupTestStore(t)
	ctx := context.Background()

	tests := []struct {
		name     string
		setup    func(t *testing.T) (accountID, postID uuid.UUID, prURL string)
		wantErr  error
		assertFn func(t *testing.T, prURL string, got BlogPost)
	}{
		{
			name: "happy path sets site PR URL and opened-at timestamp",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID, string) {
				t.Helper()
				accountID := createTestAccount(t, s)
				created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
					AccountID: accountID,
					Title:     "Site PR Test",
					Slug:      "site-pr-test-" + uuid.New().String()[:8],
					Content:   "Content",
					Status:    BlogStatusDraft,
				})
				require.NoError(t, err)
				prURL := "https://github.com/acme/site/pull/" + uuid.New().String()[:8]
				return accountID, created.ID, prURL
			},
			assertFn: func(t *testing.T, prURL string, got BlogPost) {
				t.Helper()
				require.NotNil(t, got.SitePRURL)
				assert.Equal(t, prURL, *got.SitePRURL)
				require.NotNil(t, got.SitePROpenedAt)
				assert.WithinDuration(t, time.Now(), *got.SitePROpenedAt, 10*time.Second)
				assert.WithinDuration(t, time.Now(), got.UpdatedAt, 10*time.Second)
			},
		},
		{
			name: "not found for non-existent post",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID, string) {
				t.Helper()
				accountID := createTestAccount(t, s)
				return accountID, uuid.New(), "https://github.com/acme/site/pull/1"
			},
			wantErr: ErrNotFound,
		},
		{
			name: "not found for wrong account (tenant isolation)",
			setup: func(t *testing.T) (uuid.UUID, uuid.UUID, string) {
				t.Helper()
				ownerAccountID := createTestAccount(t, s)
				created, err := s.CreateBlogPost(ctx, CreateBlogPostParams{
					AccountID: ownerAccountID,
					Title:     "Wrong Account Test",
					Slug:      "wrong-account-test-" + uuid.New().String()[:8],
					Content:   "Content",
					Status:    BlogStatusDraft,
				})
				require.NoError(t, err)
				otherAccountID := createTestAccount(t, s)
				return otherAccountID, created.ID, "https://github.com/acme/site/pull/2"
			},
			wantErr: ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			accountID, postID, prURL := tt.setup(t)
			got, err := s.SetBlogPostSitePR(ctx, accountID, postID, prURL)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			if tt.assertFn != nil {
				tt.assertFn(t, prURL, got)
			}
		})
	}
}
