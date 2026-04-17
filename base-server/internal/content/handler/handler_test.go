package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/content/processor"
	"base-server/internal/infra/observability"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var contentGinOnce sync.Once

func setupContentRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	contentGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.POST("/content/generate", h.HandleGeneratePost)
	r.POST("/content/adapt", h.HandleAdaptContent)
	r.POST("/content/thread", h.HandleGenerateThread)
	r.POST("/content/stream", h.HandleStreamGenerate)
	return r
}

func contentBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleGeneratePost(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockContentProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().GeneratePost(gomock.Any(), accountID, "write a post about Go", gomock.Any()).
					Return("Here is a post about Go!", nil)
			},
			body:       map[string]any{"prompt": "write a post about Go"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing prompt",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "503 on generation error",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().GeneratePost(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return("", processor.ErrGeneratePost)
			},
			body:       map[string]any{"prompt": "write something"},
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name: "500 on voice profile error",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().GeneratePost(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return("", processor.ErrVoiceProfile)
			},
			body:       map[string]any{"prompt": "write something"},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().GeneratePost(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return("", errors.New("boom"))
			},
			body:       map[string]any{"prompt": "write something"},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockContentProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupContentRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/content/generate", contentBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleAdaptContent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockContentProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().AdaptContent(gomock.Any(), accountID, "original content", "x").
					Return("adapted for x", nil)
			},
			body:       map[string]any{"content": "original content", "platform": "x"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing content",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"platform": "x"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing platform",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"content": "some content"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "503 on adapt error",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().AdaptContent(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return("", processor.ErrAdaptContent)
			},
			body:       map[string]any{"content": "content", "platform": "x"},
			wantStatus: http.StatusServiceUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockContentProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupContentRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/content/adapt", contentBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGenerateThread(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockContentProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().GenerateThread(gomock.Any(), "long post", "x").
					Return([]string{"part1", "part2"}, nil)
			},
			body:       map[string]any{"content": "long post", "platform": "x"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing required fields",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"content": "only content"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "503 on thread error",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().GenerateThread(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, processor.ErrGenerateThread)
			},
			body:       map[string]any{"content": "content", "platform": "x"},
			wantStatus: http.StatusServiceUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockContentProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupContentRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/content/thread", contentBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleStreamGenerate(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockContentProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path SSE stream",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().StreamGenerateAndAdapt(gomock.Any(), accountID, "my prompt", []string{"x"}, "text", gomock.Any(), 0, gomock.Any()).
					Return(nil)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing prompt",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"platforms": []string{"x"}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing platforms",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"prompt": "something"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 empty platforms",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"prompt": "something", "platforms": []string{}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 invalid base64 image",
			mocks:      func(m *MockContentProcessor) {},
			body:       map[string]any{"prompt": "something", "platforms": []string{"x"}, "images": []any{map[string]any{"mime_type": "image/png", "data": "not-base64!!!"}}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "200 SSE stream even on processor error",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().StreamGenerateAndAdapt(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(processor.ErrStreamGenerate)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
			},
			wantStatus: http.StatusOK, // SSE: header already written before error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockContentProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupContentRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
