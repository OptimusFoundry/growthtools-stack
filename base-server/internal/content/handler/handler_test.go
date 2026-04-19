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
	"base-server/internal/infra/clients/aiclient"
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

func TestHandler_HandleStreamGenerate_MediaIDs(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID1 := uuid.New()
	mediaID2 := uuid.New()

	tests := []struct {
		name           string
		mocks          func(m *MockContentProcessor)
		body           any
		wantStatus     int
		assertResponse func(t *testing.T, body string)
	}{
		{
			name: "200 media-aware path emits base_done platform_done thread_done done events",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().FetchAndBucketMedia(gomock.Any(), accountID, []uuid.UUID{mediaID1, mediaID2}).
					Return(&aiclient.ImageData{MIMEType: "video/mp4", Data: []byte("v")}, []aiclient.ImageData{{MIMEType: "image/png", Data: []byte("i")}}, true, nil)
				m.EXPECT().DecideMode(gomock.Any(), gomock.Any(), gomock.Any(), "my prompt").
					Return(processor.ModeDecision{Mode: "thread", ThreadParts: 3, Reason: "ok"}, nil)
				m.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, "my prompt", []string{"x"}, gomock.Any(), gomock.Any()).
					Return("base content", map[string]processor.ThreadWithMediaPlanResult{
						"x": {
							Content:  "seg1\nseg2",
							Segments: []processor.ThreadSegment{{Content: "seg1"}, {Content: "seg2"}},
						},
					}, nil)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
				"media_ids": []string{mediaID1.String(), mediaID2.String()},
			},
			wantStatus: http.StatusOK,
			assertResponse: func(t *testing.T, body string) {
				t.Helper()
				assert.Contains(t, body, "base_done")
				assert.Contains(t, body, "platform_done")
				assert.Contains(t, body, "thread_done")
				assert.Contains(t, body, "done")
			},
		},
		{
			name: "200 media-aware path: DecideMode failure falls back to thread mode",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().FetchAndBucketMedia(gomock.Any(), accountID, gomock.Any()).
					Return(nil, []aiclient.ImageData{{MIMEType: "image/png", Data: []byte("i")}}, false, nil)
				m.EXPECT().DecideMode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(processor.ModeDecision{}, processor.ErrDecideMode)
				m.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]processor.ThreadWithMediaPlanResult{
						"x": {Content: "content", Segments: []processor.ThreadSegment{{Content: "content"}}},
					}, nil)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
				"media_ids": []string{mediaID1.String()},
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "200 SSE error event when FetchAndBucketMedia fails",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().FetchAndBucketMedia(gomock.Any(), accountID, gomock.Any()).
					Return(nil, nil, false, processor.ErrFetchMedia)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
				"media_ids": []string{mediaID1.String()},
			},
			wantStatus: http.StatusOK, // SSE: headers already written
			assertResponse: func(t *testing.T, body string) {
				t.Helper()
				assert.Contains(t, body, "error")
			},
		},
		{
			name: "200 SSE error event when GenerateWithMediaPlan fails",
			mocks: func(m *MockContentProcessor) {
				m.EXPECT().FetchAndBucketMedia(gomock.Any(), accountID, gomock.Any()).
					Return(nil, []aiclient.ImageData{{MIMEType: "image/png", Data: []byte("i")}}, false, nil)
				m.EXPECT().DecideMode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(processor.ModeDecision{Mode: "single"}, nil)
				m.EXPECT().GenerateWithMediaPlan(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("", nil, processor.ErrStreamGenerate)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
				"media_ids": []string{mediaID1.String()},
			},
			wantStatus: http.StatusOK,
			assertResponse: func(t *testing.T, body string) {
				t.Helper()
				assert.Contains(t, body, "error")
			},
		},
		{
			name: "200 media_ids path preferred when both media_ids and images supplied",
			mocks: func(m *MockContentProcessor) {
				// media_ids path is taken — FetchAndBucketMedia is called, NOT StreamGenerateAndAdapt
				m.EXPECT().FetchAndBucketMedia(gomock.Any(), accountID, gomock.Any()).
					Return(nil, nil, false, nil)
				m.EXPECT().DecideMode(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(processor.ModeDecision{Mode: "single"}, nil)
				m.EXPECT().GenerateWithMediaPlan(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return("base", map[string]processor.ThreadWithMediaPlanResult{
						"x": {Content: "c", Segments: []processor.ThreadSegment{{Content: "c"}}},
					}, nil)
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
				"media_ids": []string{mediaID1.String()},
				"images":    []any{map[string]any{"mime_type": "image/png", "data": "aW1h"}},
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "200 error event when all media_ids are invalid UUIDs",
			mocks: func(m *MockContentProcessor) {
				// No methods should be called — invalid IDs drop to 0 valid IDs.
			},
			body: map[string]any{
				"prompt":    "my prompt",
				"platforms": []string{"x"},
				"media_ids": []string{"not-a-uuid"},
			},
			wantStatus: http.StatusOK,
			assertResponse: func(t *testing.T, body string) {
				t.Helper()
				assert.Contains(t, body, "error")
			},
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
			if tt.assertResponse != nil {
				tt.assertResponse(t, w.Body.String())
			}
		})
	}
}

