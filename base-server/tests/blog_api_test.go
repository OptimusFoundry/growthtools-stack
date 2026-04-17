//go:build integration

package tests

import (
	"context"
	"net/http"
	"testing"
	"time"

	blogHandler "base-server/internal/blog/handler"
	blogProcessor "base-server/internal/blog/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockBlogStore implements blogProcessor.BlogStore for testing.
type mockBlogStore struct {
	posts map[uuid.UUID]store.BlogPost
}

func newMockBlogStore() *mockBlogStore {
	return &mockBlogStore{
		posts: make(map[uuid.UUID]store.BlogPost),
	}
}

func (m *mockBlogStore) CreateBlogPost(_ context.Context, params store.CreateBlogPostParams) (store.BlogPost, error) {
	now := time.Now().UTC()
	post := store.BlogPost{
		ID:              uuid.New(),
		AccountID:       params.AccountID,
		Title:           params.Title,
		Slug:            params.Slug,
		Content:         params.Content,
		Excerpt:         params.Excerpt,
		Status:          params.Status,
		SEOTitle:        params.SEOTitle,
		MetaDescription: params.MetaDescription,
		Keywords:        params.Keywords,
		OGTitle:         params.OGTitle,
		OGDescription:   params.OGDescription,
		FeaturedImageID: params.FeaturedImageID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	m.posts[post.ID] = post
	return post, nil
}

func (m *mockBlogStore) GetBlogPostByID(_ context.Context, accountID, postID uuid.UUID) (store.BlogPost, error) {
	post, ok := m.posts[postID]
	if !ok || post.AccountID != accountID {
		return store.BlogPost{}, store.ErrNotFound
	}
	return post, nil
}

func (m *mockBlogStore) GetBlogPostBySlug(_ context.Context, accountID uuid.UUID, slug string) (store.BlogPost, error) {
	for _, p := range m.posts {
		if p.AccountID == accountID && p.Slug == slug {
			return p, nil
		}
	}
	return store.BlogPost{}, store.ErrNotFound
}

func (m *mockBlogStore) ListBlogPosts(_ context.Context, accountID uuid.UUID, status *string, limit, offset int) ([]store.BlogPost, error) {
	var result []store.BlogPost
	for _, p := range m.posts {
		if p.AccountID != accountID {
			continue
		}
		if status != nil && p.Status != *status {
			continue
		}
		result = append(result, p)
	}
	if offset >= len(result) {
		return []store.BlogPost{}, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockBlogStore) UpdateBlogPost(_ context.Context, accountID, id uuid.UUID, params store.UpdateBlogPostParams) (store.BlogPost, error) {
	post, ok := m.posts[id]
	if !ok || post.AccountID != accountID {
		return store.BlogPost{}, store.ErrNotFound
	}
	if params.Title != nil {
		post.Title = *params.Title
	}
	if params.Slug != nil {
		post.Slug = *params.Slug
	}
	if params.Content != nil {
		post.Content = *params.Content
	}
	if params.Excerpt != nil {
		post.Excerpt = params.Excerpt
	}
	if params.SEOTitle != nil {
		post.SEOTitle = params.SEOTitle
	}
	if params.MetaDescription != nil {
		post.MetaDescription = params.MetaDescription
	}
	if params.Keywords != nil {
		post.Keywords = params.Keywords
	}
	if params.OGTitle != nil {
		post.OGTitle = params.OGTitle
	}
	if params.OGDescription != nil {
		post.OGDescription = params.OGDescription
	}
	if params.FeaturedImageID != nil {
		post.FeaturedImageID = params.FeaturedImageID
	}
	post.UpdatedAt = time.Now().UTC()
	m.posts[id] = post
	return post, nil
}

func (m *mockBlogStore) DeleteBlogPost(_ context.Context, accountID, postID uuid.UUID) error {
	post, ok := m.posts[postID]
	if !ok || post.AccountID != accountID {
		return store.ErrNotFound
	}
	delete(m.posts, postID)
	return nil
}

func (m *mockBlogStore) PublishBlogPost(_ context.Context, accountID, id uuid.UUID) (store.BlogPost, error) {
	post, ok := m.posts[id]
	if !ok || post.AccountID != accountID {
		return store.BlogPost{}, store.ErrNotFound
	}
	now := time.Now().UTC()
	post.Status = "published"
	post.PublishedAt = &now
	post.UpdatedAt = now
	m.posts[id] = post
	return post, nil
}

// setupBlogRouter sets up a Gin router with the blog handler and mock store.
func setupBlogRouter(accountID uuid.UUID) (*gin.Engine, *mockBlogStore) {
	mockStore := newMockBlogStore()
	logger := testLogger()

	proc := blogProcessor.New(mockStore, logger)
	handler := blogHandler.New(proc, logger)

	router := setupTestRouter()
	protected := router.Group("/api/protected", mockAuthMiddleware(accountID))
	{
		protected.POST("/blog", handler.HandleCreateBlog)
		protected.GET("/blog", handler.HandleListBlogs)
		protected.GET("/blog/:id", handler.HandleGetBlog)
		protected.PUT("/blog/:id", handler.HandleUpdateBlog)
		protected.DELETE("/blog/:id", handler.HandleDeleteBlog)
		protected.POST("/blog/:id/publish", handler.HandlePublishBlog)
	}

	return router, mockStore
}

func TestBlogAPI_CreateBlog(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	body := map[string]interface{}{
		"title":   "My First Blog",
		"slug":    "my-first-blog",
		"content": "# Hello World\nThis is my first blog post.",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/blog", body)
	assertStatus(t, w, http.StatusCreated)

	var resp store.BlogPost
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "My First Blog", resp.Title)
	assert.Equal(t, "my-first-blog", resp.Slug)
	assert.Equal(t, "draft", resp.Status)
	assert.Equal(t, accountID, resp.AccountID)
}

func TestBlogAPI_CreateBlog_ValidationError(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	// Missing required fields (title, slug, content)
	body := map[string]interface{}{
		"title": "Only Title",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/blog", body)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestBlogAPI_CreateBlog_DuplicateSlug(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	body := map[string]interface{}{
		"title":   "First Post",
		"slug":    "duplicate-slug",
		"content": "Content 1",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/blog", body)
	assertStatus(t, w, http.StatusCreated)

	// Try creating another with the same slug
	body["title"] = "Second Post"
	body["content"] = "Content 2"

	w = makeRequest(t, router, http.MethodPost, "/api/protected/blog", body)
	assertStatus(t, w, http.StatusConflict)

	var resp errorResponse
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "SLUG_EXISTS", resp.Code)
}

func TestBlogAPI_CreateBlog_WithSEOFields(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	body := map[string]interface{}{
		"title":            "SEO Blog",
		"slug":             "seo-blog",
		"content":          "SEO-optimized content",
		"excerpt":          "A short excerpt",
		"seo_title":        "SEO Title",
		"meta_description": "Meta description for SEO",
		"keywords":         []string{"seo", "blog"},
		"og_title":         "OG Title",
		"og_description":   "OG Description",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/blog", body)
	assertStatus(t, w, http.StatusCreated)

	var resp store.BlogPost
	parseResponseBody(t, w, &resp)
	require.NotNil(t, resp.Excerpt)
	assert.Equal(t, "A short excerpt", *resp.Excerpt)
	require.NotNil(t, resp.SEOTitle)
	assert.Equal(t, "SEO Title", *resp.SEOTitle)
}

func TestBlogAPI_ListBlogs(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupBlogRouter(accountID)

	// Seed blog posts
	for i := 0; i < 3; i++ {
		id := uuid.New()
		mockStore.posts[id] = store.BlogPost{
			ID:        id,
			AccountID: accountID,
			Title:     "Blog Post",
			Slug:      "blog-" + id.String()[:8],
			Content:   "Content",
			Status:    "draft",
			Keywords:  store.StringArray{},
		}
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/blog", nil)
	assertStatus(t, w, http.StatusOK)

	var posts []store.BlogPost
	parseResponseBody(t, w, &posts)
	assert.Len(t, posts, 3)
}

func TestBlogAPI_GetBlog(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupBlogRouter(accountID)

	blogID := uuid.New()
	mockStore.posts[blogID] = store.BlogPost{
		ID:        blogID,
		AccountID: accountID,
		Title:     "Test Blog",
		Slug:      "test-blog",
		Content:   "Test content",
		Status:    "draft",
		Keywords:  store.StringArray{},
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/blog/"+blogID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.BlogPost
	parseResponseBody(t, w, &resp)
	assert.Equal(t, blogID, resp.ID)
	assert.Equal(t, "Test Blog", resp.Title)
}

func TestBlogAPI_GetBlog_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodGet, "/api/protected/blog/"+fakeID.String(), nil)
	assertNotFound(t, w)
}

func TestBlogAPI_UpdateBlog(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupBlogRouter(accountID)

	blogID := uuid.New()
	mockStore.posts[blogID] = store.BlogPost{
		ID:        blogID,
		AccountID: accountID,
		Title:     "Original Title",
		Slug:      "original-slug",
		Content:   "Original content",
		Status:    "draft",
		Keywords:  store.StringArray{},
	}

	body := map[string]interface{}{
		"title":   "Updated Title",
		"content": "Updated content",
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/blog/"+blogID.String(), body)
	assertStatus(t, w, http.StatusOK)

	var resp store.BlogPost
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "Updated Title", resp.Title)
	assert.Equal(t, "Updated content", resp.Content)
}

func TestBlogAPI_UpdateBlog_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	fakeID := uuid.New()
	body := map[string]interface{}{
		"title": "Will not update",
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/blog/"+fakeID.String(), body)
	assertNotFound(t, w)
}

func TestBlogAPI_DeleteBlog(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupBlogRouter(accountID)

	blogID := uuid.New()
	mockStore.posts[blogID] = store.BlogPost{
		ID:        blogID,
		AccountID: accountID,
		Title:     "To Delete",
		Slug:      "to-delete",
		Content:   "Will be deleted",
		Status:    "draft",
		Keywords:  store.StringArray{},
	}

	w := makeRequest(t, router, http.MethodDelete, "/api/protected/blog/"+blogID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var resp messageResponse
	parseResponseBody(t, w, &resp)
	assert.Contains(t, resp.Message, "deleted")

	_, exists := mockStore.posts[blogID]
	assert.False(t, exists)
}

func TestBlogAPI_DeleteBlog_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodDelete, "/api/protected/blog/"+fakeID.String(), nil)
	assertNotFound(t, w)
}

func TestBlogAPI_PublishBlog(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupBlogRouter(accountID)

	blogID := uuid.New()
	mockStore.posts[blogID] = store.BlogPost{
		ID:        blogID,
		AccountID: accountID,
		Title:     "Publish Me",
		Slug:      "publish-me",
		Content:   "Content to publish",
		Status:    "draft",
		Keywords:  store.StringArray{},
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/blog/"+blogID.String()+"/publish", nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.BlogPost
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "published", resp.Status)
	assert.NotNil(t, resp.PublishedAt)
}

func TestBlogAPI_PublishBlog_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodPost, "/api/protected/blog/"+fakeID.String()+"/publish", nil)
	assertNotFound(t, w)
}

func TestBlogAPI_GetBlog_InvalidID(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupBlogRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/blog/not-a-uuid", nil)
	assertStatus(t, w, http.StatusBadRequest)
}
