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
					Return([]store.BlogPost{}, nil)
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
		name       string
		mocks      func(m *MockBlogProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(store.BlogPost{ID: postID}, nil)
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
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(store.BlogPost{}, processor.ErrBlogPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 unexpected error",
			mocks: func(m *MockBlogProcessor) {
				m.EXPECT().PublishBlogPost(gomock.Any(), accountID, postID).
					Return(store.BlogPost{}, errors.New("boom"))
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

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
