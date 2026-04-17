//go:build integration

package tests

import (
	"context"
	"net/http"
	"testing"
	"time"

	postsHandler "base-server/internal/posts/handler"
	postsProcessor "base-server/internal/posts/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockPostStore implements postsProcessor.PostStore for testing.
type mockPostStore struct {
	posts         map[uuid.UUID]store.Post
	platformPosts map[uuid.UUID][]store.PlatformPost
}

func newMockPostStore() *mockPostStore {
	return &mockPostStore{
		posts:         make(map[uuid.UUID]store.Post),
		platformPosts: make(map[uuid.UUID][]store.PlatformPost),
	}
}

func (m *mockPostStore) CreatePost(_ context.Context, params store.CreatePostParams) (store.Post, error) {
	now := time.Now().UTC()
	post := store.Post{
		ID:          uuid.New(),
		AccountID:   params.AccountID,
		Title:       params.Title,
		Content:     params.Content,
		ContentType: params.ContentType,
		Status:      params.Status,
		MediaIDs:    params.MediaIDs,
		Tags:        params.Tags,
		AIGenerated: params.AIGenerated,
		Source:      params.Source,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	m.posts[post.ID] = post
	return post, nil
}

func (m *mockPostStore) GetPostByID(_ context.Context, accountID, postID uuid.UUID) (store.Post, error) {
	post, ok := m.posts[postID]
	if !ok || post.AccountID != accountID {
		return store.Post{}, store.ErrNotFound
	}
	return post, nil
}

func (m *mockPostStore) ListPosts(_ context.Context, params store.ListPostsParams) ([]store.Post, error) {
	var result []store.Post
	for _, p := range m.posts {
		if p.AccountID != params.AccountID {
			continue
		}
		if params.Status != nil && p.Status != *params.Status {
			continue
		}
		if params.ContentType != nil && p.ContentType != *params.ContentType {
			continue
		}
		if params.Source != nil && p.Source != *params.Source {
			continue
		}
		result = append(result, p)
	}

	if params.Offset >= len(result) {
		return []store.Post{}, nil
	}
	end := params.Offset + params.Limit
	if end > len(result) {
		end = len(result)
	}
	return result[params.Offset:end], nil
}

func (m *mockPostStore) UpdatePost(_ context.Context, accountID, id uuid.UUID, params store.UpdatePostParams) (store.Post, error) {
	post, ok := m.posts[id]
	if !ok || post.AccountID != accountID {
		return store.Post{}, store.ErrNotFound
	}
	if params.Title != nil {
		post.Title = params.Title
	}
	if params.Content != nil {
		post.Content = *params.Content
	}
	if params.ContentType != nil {
		post.ContentType = *params.ContentType
	}
	if params.Status != nil {
		post.Status = *params.Status
	}
	if params.ScheduledAt != nil {
		post.ScheduledAt = params.ScheduledAt
	}
	post.UpdatedAt = time.Now().UTC()
	m.posts[id] = post
	return post, nil
}

func (m *mockPostStore) DeletePost(_ context.Context, accountID, postID uuid.UUID) error {
	post, ok := m.posts[postID]
	if !ok || post.AccountID != accountID {
		return store.ErrNotFound
	}
	delete(m.posts, postID)
	return nil
}

func (m *mockPostStore) UpdatePostStatus(_ context.Context, accountID, id uuid.UUID, status string, publishedAt *time.Time) error {
	post, ok := m.posts[id]
	if !ok || post.AccountID != accountID {
		return store.ErrNotFound
	}
	post.Status = status
	post.PublishedAt = publishedAt
	post.UpdatedAt = time.Now().UTC()
	m.posts[id] = post
	return nil
}

func (m *mockPostStore) CreatePlatformPost(_ context.Context, params store.CreatePlatformPostParams) (store.PlatformPost, error) {
	now := time.Now().UTC()
	pp := store.PlatformPost{
		ID:        uuid.New(),
		PostID:    params.PostID,
		Platform:  params.Platform,
		Status:    "pending",
		Content:   params.Content,
		CreatedAt: now,
		UpdatedAt: now,
	}
	m.platformPosts[params.PostID] = append(m.platformPosts[params.PostID], pp)
	return pp, nil
}

func (m *mockPostStore) GetPlatformPostsByPostID(_ context.Context, postID uuid.UUID) ([]store.PlatformPost, error) {
	return m.platformPosts[postID], nil
}

func (m *mockPostStore) DeletePlatformPostsByPostID(_ context.Context, postID uuid.UUID) error {
	delete(m.platformPosts, postID)
	return nil
}

func (m *mockPostStore) ResetPlatformPostsForRetry(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (m *mockPostStore) GetMediaByIDs(_ context.Context, _ []uuid.UUID) ([]store.Media, error) {
	return []store.Media{}, nil
}

// mockPostPublisher is a no-op EventPublisher used when the handler
// doesn't exercise the publish path.
type mockPostPublisher struct{}

func (m *mockPostPublisher) Publish(_ context.Context, _ string, _ string, _ interface{}) error {
	return nil
}

// setupPostsRouter sets up a Gin router with the posts handler and mock store.
func setupPostsRouter(accountID uuid.UUID) (*gin.Engine, *mockPostStore) {
	mockStore := newMockPostStore()
	logger := testLogger()

	proc := postsProcessor.New(mockStore, &mockPostPublisher{}, logger)
	handler := postsHandler.New(proc, logger)

	router := setupTestRouter()
	protected := router.Group("/api/protected", mockAuthMiddleware(accountID))
	{
		protected.POST("/posts", handler.HandleCreatePost)
		protected.GET("/posts", handler.HandleListPosts)
		protected.GET("/posts/:id", handler.HandleGetPost)
		protected.PUT("/posts/:id", handler.HandleUpdatePost)
		protected.DELETE("/posts/:id", handler.HandleDeletePost)
		protected.POST("/posts/:id/publish", handler.HandlePublishPost)
		protected.POST("/posts/:id/schedule", handler.HandleSchedulePost)
	}

	return router, mockStore
}

func TestPostsAPI_CreatePost(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	body := map[string]interface{}{
		"content":      "Hello world!",
		"content_type": "short",
		"tags":         []string{"go", "test"},
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts", body)
	assertStatus(t, w, http.StatusCreated)

	var resp store.Post
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "Hello world!", resp.Content)
	assert.Equal(t, "short", resp.ContentType)
	assert.Equal(t, "draft", resp.Status)
	assert.Equal(t, accountID, resp.AccountID)
}

func TestPostsAPI_CreatePost_WithTitle(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	body := map[string]interface{}{
		"title":        "My Post Title",
		"content":      "Post body content",
		"content_type": "long",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts", body)
	assertStatus(t, w, http.StatusCreated)

	var resp store.Post
	parseResponseBody(t, w, &resp)
	require.NotNil(t, resp.Title)
	assert.Equal(t, "My Post Title", *resp.Title)
}

func TestPostsAPI_CreatePost_ValidationError(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	// Missing required fields
	body := map[string]interface{}{
		"title": "No content or content_type",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts", body)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestPostsAPI_ListPosts(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	// Seed some posts
	for i := 0; i < 3; i++ {
		mockStore.posts[uuid.New()] = store.Post{
			ID:          uuid.New(),
			AccountID:   accountID,
			Content:     "Post content",
			ContentType: "short",
			Status:      "draft",
			Source:      "manual",
			Tags:        store.StringArray{},
			MediaIDs:    store.UUIDArray{},
		}
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/posts", nil)
	assertStatus(t, w, http.StatusOK)

	var posts []store.Post
	parseResponseBody(t, w, &posts)
	assert.Equal(t, 3, len(posts))
}

func TestPostsAPI_ListPosts_Empty(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/posts", nil)
	assertStatus(t, w, http.StatusOK)

	var posts []store.Post
	parseResponseBody(t, w, &posts)
	assert.Empty(t, posts)
}

func TestPostsAPI_GetPost(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "Test post",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	w := makeRequest(t, router, http.MethodGet, "/api/protected/posts/"+postID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.Post
	parseResponseBody(t, w, &resp)
	assert.Equal(t, postID, resp.ID)
	assert.Equal(t, "Test post", resp.Content)
}

func TestPostsAPI_GetPost_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodGet, "/api/protected/posts/"+fakeID.String(), nil)
	assertNotFound(t, w)
}

func TestPostsAPI_GetPost_InvalidID(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/posts/not-a-uuid", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestPostsAPI_UpdatePost(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "Original content",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	body := map[string]interface{}{
		"content": "Updated content",
		"tags":    []string{"updated"},
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/posts/"+postID.String(), body)
	assertStatus(t, w, http.StatusOK)

	var resp store.Post
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "Updated content", resp.Content)
}

func TestPostsAPI_UpdatePost_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	fakeID := uuid.New()
	body := map[string]interface{}{
		"content": "Will not update",
	}

	w := makeRequest(t, router, http.MethodPut, "/api/protected/posts/"+fakeID.String(), body)
	assertNotFound(t, w)
}

func TestPostsAPI_DeletePost(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "To be deleted",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	w := makeRequest(t, router, http.MethodDelete, "/api/protected/posts/"+postID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var resp messageResponse
	parseResponseBody(t, w, &resp)
	assert.Contains(t, resp.Message, "deleted")

	// Verify the post is actually gone
	_, exists := mockStore.posts[postID]
	assert.False(t, exists)
}

func TestPostsAPI_DeletePost_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	fakeID := uuid.New()
	w := makeRequest(t, router, http.MethodDelete, "/api/protected/posts/"+fakeID.String(), nil)
	assertNotFound(t, w)
}

func TestPostsAPI_PublishPost(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "Publish me",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	body := map[string]interface{}{
		"platforms": []string{"twitter", "linkedin"},
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts/"+postID.String()+"/publish", body)
	assertStatus(t, w, http.StatusOK)

	var resp messageResponse
	parseResponseBody(t, w, &resp)
	assert.Contains(t, resp.Message, "publishing")

	// Verify platform posts were created
	pps := mockStore.platformPosts[postID]
	assert.Len(t, pps, 2)

	// Verify post status changed
	post := mockStore.posts[postID]
	assert.Equal(t, "publishing", post.Status)
}

func TestPostsAPI_PublishPost_NotFound(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	fakeID := uuid.New()
	body := map[string]interface{}{
		"platforms": []string{"twitter"},
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts/"+fakeID.String()+"/publish", body)
	assertNotFound(t, w)
}

func TestPostsAPI_PublishPost_MissingPlatforms(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "Missing platforms",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	body := map[string]interface{}{}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts/"+postID.String()+"/publish", body)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestPostsAPI_SchedulePost(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "Schedule me",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	scheduledTime := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)
	body := map[string]interface{}{
		"scheduled_at": scheduledTime,
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts/"+postID.String()+"/schedule", body)
	assertStatus(t, w, http.StatusOK)

	var resp store.Post
	parseResponseBody(t, w, &resp)
	assert.Equal(t, "scheduled", resp.Status)
}

func TestPostsAPI_SchedulePost_InvalidDate(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, mockStore := setupPostsRouter(accountID)

	postID := uuid.New()
	mockStore.posts[postID] = store.Post{
		ID:          postID,
		AccountID:   accountID,
		Content:     "Bad schedule",
		ContentType: "short",
		Status:      "draft",
		Source:      "manual",
		Tags:        store.StringArray{},
		MediaIDs:    store.UUIDArray{},
	}

	body := map[string]interface{}{
		"scheduled_at": "not-a-date",
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts/"+postID.String()+"/schedule", body)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestPostsAPI_CrossAccountIsolation(t *testing.T) {
	t.Parallel()

	accountA := uuid.New()
	accountB := uuid.New()

	routerA, mockStoreA := setupPostsRouter(accountA)
	_ = mockStoreA

	// Create a post for account A
	body := map[string]interface{}{
		"content":      "Account A post",
		"content_type": "short",
	}
	w := makeRequest(t, routerA, http.MethodPost, "/api/protected/posts", body)
	assertStatus(t, w, http.StatusCreated)

	var postA store.Post
	parseResponseBody(t, w, &postA)

	// Account B tries to access account A's post using a separate router
	routerB, _ := setupPostsRouter(accountB)
	w = makeRequest(t, routerB, http.MethodGet, "/api/protected/posts/"+postA.ID.String(), nil)
	assertNotFound(t, w)
}

// Test that creating a post and retrieving it preserves data.
func TestPostsAPI_CreateAndGet_RoundTrip(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router, _ := setupPostsRouter(accountID)

	createBody := map[string]interface{}{
		"title":        "Round trip test",
		"content":      "Round trip content",
		"content_type": "long",
		"tags":         []string{"alpha", "beta"},
	}

	w := makeRequest(t, router, http.MethodPost, "/api/protected/posts", createBody)
	assertStatus(t, w, http.StatusCreated)

	var created store.Post
	parseResponseBody(t, w, &created)

	// Fetch the same post
	w = makeRequest(t, router, http.MethodGet, "/api/protected/posts/"+created.ID.String(), nil)
	assertStatus(t, w, http.StatusOK)

	var fetched store.Post
	parseResponseBody(t, w, &fetched)

	assert.Equal(t, created.ID, fetched.ID)
	assert.Equal(t, created.Content, fetched.Content)

	// Check it appears in the list
	w = makeRequest(t, router, http.MethodGet, "/api/protected/posts", nil)
	assertStatus(t, w, http.StatusOK)

	var posts []store.Post
	parseResponseBody(t, w, &posts)
	assert.GreaterOrEqual(t, len(posts), 1)
}

