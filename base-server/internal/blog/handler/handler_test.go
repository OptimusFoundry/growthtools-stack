package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/blog/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var blogGinOnce sync.Once

func setupBlogRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	blogGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.POST("/blogs", h.HandleCreateBlog)
	r.GET("/blogs/:id", h.HandleGetBlog)
	r.GET("/blogs", h.HandleListBlogs)
	r.PUT("/blogs/:id", h.HandleUpdateBlog)
	r.DELETE("/blogs/:id", h.HandleDeleteBlog)
	r.POST("/blogs/:id/publish", h.HandlePublishBlog)
	r.POST("/blogs/:id/publish/retry", h.HandleRetrySitePublish)
	return r
}

func setupBlogRouterNoAuth(h Handler) *gin.Engine {
	blogGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.POST("/blogs/:id/publish/retry", h.HandleRetrySitePublish)
	return r
}

func blogBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleCreateBlog(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockBlogProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "201 happy path",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().CreateBlogPost(gomock.Any(), gomock.Any()).
					Return(store.BlogPost{ID: uuid.New()}, nil)
			},
			body: map[string]any{
				"title":   "My Blog",
				"slug":    "my-blog",
				"content": "body",
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "400 missing required fields",
			mocks:      func(m *MockBlogProcessor) {},
			body:       map[string]any{"title": "only title"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "409 slug already exists",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().CreateBlogPost(gomock.Any(), gomock.Any()).
					Return(store.BlogPost{}, processor.ErrSlugAlreadyExists)
			},
			body: map[string]any{
				"title":   "My Blog",
				"slug":    "my-blog",
				"content": "body",
			},
			wantStatus: http.StatusConflict,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().CreateBlogPost(gomock.Any(), gomock.Any()).
					Return(store.BlogPost{}, errors.New("db exploded"))
			},
			body: map[string]any{
				"title":   "My Blog",
				"slug":    "my-blog",
				"content": "body",
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockBlogProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupBlogRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/blogs", blogBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetBlog(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockBlogProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().GetBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPostWithMedia{Post: store.BlogPost{ID: postID}}, nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockBlogProcessor) {},
			postID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 not found",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().GetBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPostWithMedia{}, processor.ErrBlogPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().GetBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPostWithMedia{}, errors.New("boom"))
			},
			postID:     postID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockBlogProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupBlogRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/blogs/"+tt.postID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleListBlogs(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockBlogProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().ListBlogPosts(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]store.BlogPostListItem{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on processor error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().ListBlogPosts(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockBlogProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupBlogRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/blogs", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDeleteBlog(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockBlogProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().DeleteBlogPost(gomock.Any(), accountID, postID).Return(nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockBlogProcessor) {},
			postID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 not found",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().DeleteBlogPost(gomock.Any(), accountID, postID).
					Return(processor.ErrBlogPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockBlogProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupBlogRouter(h, accountID)

			req := httptest.NewRequest(http.MethodDelete, "/blogs/"+tt.postID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandlePublishBlog(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name        string
		mocks       func(m *MockBlogProcessor)
		postID      string
		wantStatus  int
		wantSiteErr string
		checkBody   bool
	}{
		{
			name: "200 happy path with no site publish error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{Post: store.BlogPost{ID: postID}}, nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
			checkBody:  true,
		},
		{
			name: "200 happy path with site publish error surfaced in body",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{
						Post:             store.BlogPost{ID: postID},
						SitePublishError: "site is unreachable",
					}, nil)
			},
			postID:      postID.String(),
			wantStatus:  http.StatusOK,
			checkBody:   true,
			wantSiteErr: "site is unreachable",
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockBlogProcessor) {},
			postID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 not found",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{}, processor.ErrBlogPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 unexpected error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{}, errors.New("boom"))
			},
			postID:     postID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockBlogProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupBlogRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/blogs/"+tt.postID+"/publish", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, tt.wantStatus, w.Code)

			if tt.checkBody {
				var body map[string]any
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
				if tt.wantSiteErr != "" {
					assert.Equal(t, tt.wantSiteErr, body["site_publish_error"])
				} else {
					_, present := body["site_publish_error"]
					assert.False(t, present, "site_publish_error should be omitted when empty")
				}
			}
		})
	}
}

func TestHandleRetrySitePublish(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockBlogProcessor)
		postID     string
		noAuth     bool
		wantStatus int
		wantCode   string
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().RetrySitePublish(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{Post: store.BlogPost{ID: postID}}, nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid blog post ID",
			mocks:      func(m *MockBlogProcessor) {},
			postID:     "not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "401 unauthorized when account ID missing from context",
			mocks:      func(m *MockBlogProcessor) {},
			postID:     postID.String(),
			noAuth:     true,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 not found",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().RetrySitePublish(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{}, processor.ErrBlogPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "409 not published yet",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().RetrySitePublish(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{}, processor.ErrBlogPostNotPublished)
			},
			postID:     postID.String(),
			wantStatus: http.StatusConflict,
			wantCode:   "BLOG_NOT_PUBLISHED",
		},
		{
			name: "500 unexpected error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().RetrySitePublish(gomock.Any(), accountID, postID).
					Return(processor.BlogPublishResult{}, errors.New("boom"))
			},
			postID:     postID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockBlogProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			var router *gin.Engine
			if tt.noAuth {
				router = setupBlogRouterNoAuth(h)
			} else {
				router = setupBlogRouter(h, accountID)
			}

			req := httptest.NewRequest(http.MethodPost, "/blogs/"+tt.postID+"/publish/retry", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, tt.wantStatus, w.Code)

			if tt.wantCode != "" {
				var body map[string]any
				require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
				assert.Equal(t, tt.wantCode, body["code"])
			}
		})
	}
}
