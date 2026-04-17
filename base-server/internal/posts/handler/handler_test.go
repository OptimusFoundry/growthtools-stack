package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/posts/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var postsGinOnce sync.Once

func setupPostsRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	postsGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.POST("/posts", h.HandleCreatePost)
	r.GET("/posts", h.HandleListPosts)
	r.GET("/posts/:id", h.HandleGetPost)
	r.PUT("/posts/:id", h.HandleUpdatePost)
	r.DELETE("/posts/:id", h.HandleDeletePost)
	r.POST("/posts/:id/publish", h.HandlePublishPost)
	r.POST("/posts/:id/schedule", h.HandleSchedulePost)
	r.POST("/posts/draft", h.HandleSaveDraft)
	r.GET("/posts/:id/details", h.HandleGetPostDetails)
	r.PUT("/posts/:id/draft", h.HandleUpdateDraft)
	r.POST("/posts/:id/retry", h.HandleRetryPost)
	return r
}

func jsonBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleCreatePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "201 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
					Return(store.Post{ID: uuid.New(), Content: "hello"}, nil)
			},
			body:       map[string]any{"content": "hello", "content_type": "post"},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "400 missing required fields",
			mocks:      func(m *MockPostProcessor) {},
			body:       map[string]any{"title": "only title"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "500 on processor error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().CreatePost(gomock.Any(), gomock.Any()).
					Return(store.Post{}, processor.ErrFailedCreatePost)
			},
			body:       map[string]any{"content": "hello", "content_type": "post"},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/posts", jsonBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().GetPost(gomock.Any(), accountID, postID).
					Return(store.Post{ID: postID, Content: "found"}, nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().GetPost(gomock.Any(), accountID, postID).
					Return(store.Post{}, processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().GetPost(gomock.Any(), accountID, postID).
					Return(store.Post{}, errors.New("boom"))
			},
			postID:     postID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/posts/"+tt.postID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleListPosts(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		query      string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().ListPosts(gomock.Any(), gomock.Any()).
					Return([]store.Post{{ID: uuid.New()}}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on processor error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().ListPosts(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/posts"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleUpdatePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).
					Return(store.Post{ID: postID, Content: "updated"}, nil)
			},
			postID:     postID.String(),
			body:       map[string]any{"content": "updated"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "bad",
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).
					Return(store.Post{}, processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on update error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().UpdatePost(gomock.Any(), accountID, postID, gomock.Any()).
					Return(store.Post{}, processor.ErrFailedUpdatePost)
			},
			postID:     postID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPut, "/posts/"+tt.postID, jsonBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDeletePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().DeletePost(gomock.Any(), accountID, postID).Return(nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().DeletePost(gomock.Any(), accountID, postID).Return(processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on delete error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().DeletePost(gomock.Any(), accountID, postID).Return(processor.ErrFailedDeletePost)
			},
			postID:     postID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodDelete, "/posts/"+tt.postID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandlePublishPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().PublishPost(gomock.Any(), accountID, postID, []string{"x"}).Return(nil)
			},
			postID:     postID.String(),
			body:       map[string]any{"platforms": []string{"x"}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "bad",
			body:       map[string]any{"platforms": []string{"x"}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing platforms",
			mocks:      func(m *MockPostProcessor) {},
			postID:     postID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().PublishPost(gomock.Any(), accountID, postID, gomock.Any()).Return(processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			body:       map[string]any{"platforms": []string{"x"}},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on update error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().PublishPost(gomock.Any(), accountID, postID, gomock.Any()).Return(processor.ErrFailedUpdatePost)
			},
			postID:     postID.String(),
			body:       map[string]any{"platforms": []string{"x"}},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/posts/"+tt.postID+"/publish", jsonBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleSchedulePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()
	futureTime := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().SchedulePost(gomock.Any(), accountID, postID, gomock.Any()).
					Return(store.Post{ID: postID, Status: "scheduled"}, nil)
			},
			postID:     postID.String(),
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "bad",
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing scheduled_at",
			mocks:      func(m *MockPostProcessor) {},
			postID:     postID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 invalid date format",
			mocks:      func(m *MockPostProcessor) {},
			postID:     postID.String(),
			body:       map[string]any{"scheduled_at": "not-a-date"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().SchedulePost(gomock.Any(), accountID, postID, gomock.Any()).
					Return(store.Post{}, processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on update error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().SchedulePost(gomock.Any(), accountID, postID, gomock.Any()).
					Return(store.Post{}, processor.ErrFailedUpdatePost)
			},
			postID:     postID.String(),
			body:       map[string]any{"scheduled_at": futureTime},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/posts/"+tt.postID+"/schedule", jsonBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleSaveDraft(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "201 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).
					Return(store.Post{ID: uuid.New(), Status: "draft"}, nil)
			},
			body: map[string]any{
				"content":      "base content",
				"content_type": "text",
				"platforms":    []map[string]any{{"platform": "x"}},
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:  "400 missing required fields",
			mocks: func(m *MockPostProcessor) {},
			body:  map[string]any{"title": "no content"},
			// platforms is required but content is also required
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "500 on save error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().SaveDraft(gomock.Any(), gomock.Any()).
					Return(store.Post{}, processor.ErrFailedSaveDraft)
			},
			body: map[string]any{
				"content":      "base content",
				"content_type": "text",
				"platforms":    []map[string]any{{"platform": "x"}},
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/posts/draft", jsonBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetPostDetails(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().GetPostWithPlatformPosts(gomock.Any(), accountID, postID).
					Return(processor.PostWithPlatformPosts{Post: store.Post{ID: postID}}, nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().GetPostWithPlatformPosts(gomock.Any(), accountID, postID).
					Return(processor.PostWithPlatformPosts{}, processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/posts/"+tt.postID+"/details", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleRetryPost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	postID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPostProcessor)
		postID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().RetryFailedPlatformPosts(gomock.Any(), accountID, postID).Return(nil)
			},
			postID:     postID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPostProcessor) {},
			postID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 post not found",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().RetryFailedPlatformPosts(gomock.Any(), accountID, postID).Return(processor.ErrPostNotFound)
			},
			postID:     postID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on retry error",
			mocks: func(m *MockPostProcessor) {
				m.EXPECT().RetryFailedPlatformPosts(gomock.Any(), accountID, postID).Return(processor.ErrFailedRetryPost)
			},
			postID:     postID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPostProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupPostsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/posts/"+tt.postID+"/retry", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
