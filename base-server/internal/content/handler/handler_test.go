package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"base-server/internal/ai/mediadescriber"
	"base-server/internal/ai/socialposts"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var contentGinOnce sync.Once

func setupContentRouter(h Handler, accountID uuid.UUID) *http.ServeMux {
	mux := http.NewServeMux()

	// Wrap handler to set Account-ID in context.
	handler := func(path string, fn func(*http.ResponseWriter, *http.Request)) {
		mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			r.Header.Set("Account-ID", accountID.String())
			// Hack: inject into context-like structure since http.Request.Context() doesn't allow direct Set.
			fn(&w, r)
		})
	}

	handler("/content/stream", func(w *http.ResponseWriter, r *http.Request) {
		h.HandleStreamGenerate(setupGinContext(*w, r, accountID))
	})

	return mux
}

func setupGinContext(w http.ResponseWriter, r *http.Request, accountID uuid.UUID) *gin.Context {
	contentGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	c, _ := gin.CreateTestContext(w)
	c.Request = r
	c.Set("Account-ID", accountID.String())
	return c
}

func contentBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleStreamGenerate_ValidationAndMissingFields(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name           string
		body           any
		wantStatus     int
		wantHeaderType string
	}{
		{
			name:       "400 missing prompt",
			body:       map[string]any{"platforms": []string{"x"}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing platforms",
			body:       map[string]any{"prompt": "something"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 empty platforms",
			body:       map[string]any{"prompt": "something", "platforms": []string{}},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:           "400 missing content_type (required for new handler)",
			body:           map[string]any{"prompt": "something", "platforms": []string{"x"}},
			wantStatus:     http.StatusBadRequest,
			wantHeaderType: "application/json",
		},
		{
			name:           "400 invalid content_type",
			body:           map[string]any{"prompt": "something", "platforms": []string{"x"}, "content_type": "invalid"},
			wantStatus:     http.StatusBadRequest,
			wantHeaderType: "application/json",
		},
		{
			name:           "400 invalid base64 image",
			body:           map[string]any{"prompt": "something", "platforms": []string{"x"}, "content_type": "text", "images": []any{map[string]any{"mime_type": "image/png", "data": "not-base64!!!"}}},
			wantStatus:     http.StatusBadRequest,
			wantHeaderType: "application/json",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			describer := NewMockDescriber(ctrl)
			generator := NewMockGenerator(ctrl)
			mockStore := NewMockHandlerStore(ctrl)
			s3 := NewMockS3Fetcher(ctrl)

			h := New(describer, generator, mockStore, s3, logger)

			// Create test request.
			w := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")

			// Setup gin context.
			ctx, _ := gin.CreateTestContext(w)
			ctx.Request = req
			ctx.Set("Account-ID", accountID.String())

			h.HandleStreamGenerate(ctx)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleStreamGenerate_TextContent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	describer := NewMockDescriber(ctrl)
	generator := NewMockGenerator(ctrl)
	mockStore := NewMockHandlerStore(ctrl)
	s3 := NewMockS3Fetcher(ctrl)

	// Setup expectations.
	mockStore.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
		Return(store.VoiceProfile{}, nil).
		Times(1)

	// Setup generator stream to emit events.
	eventCh := make(chan socialposts.Event, 10)
	eventCh <- socialposts.PhaseEvent{Phase: "generating", Platform: ""}
	eventCh <- socialposts.BaseDoneEvent{Content: "base content"}
	eventCh <- socialposts.PlatformDoneEvent{
		Platform: "x",
		Result:   socialposts.SinglePost{PlatformName: "x", Content: "adapted for x"},
	}
	close(eventCh)

	generator.EXPECT().GenerateStream(gomock.Any(), gomock.Any()).
		Return((<-chan socialposts.Event)(eventCh), nil).
		Times(1)

	h := New(describer, generator, mockStore, s3, logger)

	// Create test request.
	w := httptest.NewRecorder()
	body := map[string]any{
		"prompt":       "write a post",
		"platforms":    []string{"x"},
		"content_type": "text",
	}
	req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
	req.Header.Set("Content-Type", "application/json")

	// Setup gin context.
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Set("Account-ID", accountID.String())

	h.HandleStreamGenerate(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "phase")
	assert.Contains(t, w.Body.String(), "base_done")
	assert.Contains(t, w.Body.String(), "platform_done")
}

func TestHandler_HandleStreamGenerate_ThreadContent(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	describer := NewMockDescriber(ctrl)
	generator := NewMockGenerator(ctrl)
	mockStore := NewMockHandlerStore(ctrl)
	s3 := NewMockS3Fetcher(ctrl)

	// Setup expectations.
	mockStore.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
		Return(store.VoiceProfile{}, nil).
		Times(1)

	// Setup generator stream to emit events.
	eventCh := make(chan socialposts.Event, 10)
	eventCh <- socialposts.PhaseEvent{Phase: "generating", Platform: ""}
	eventCh <- socialposts.BaseDoneEvent{Content: "base content"}
	eventCh <- socialposts.PlatformDoneEvent{
		Platform: "x",
		Result: socialposts.Thread{
			PlatformName: "x",
			Segments: []socialposts.Segment{
				socialposts.TextSegment{Content: "part 1"},
				socialposts.TextSegment{Content: "part 2"},
			},
		},
	}
	close(eventCh)

	generator.EXPECT().GenerateStream(gomock.Any(), gomock.Any()).
		Return((<-chan socialposts.Event)(eventCh), nil).
		Times(1)

	h := New(describer, generator, mockStore, s3, logger)

	// Create test request.
	w := httptest.NewRecorder()
	body := map[string]any{
		"prompt":       "write a thread",
		"platforms":    []string{"x"},
		"content_type": "thread",
	}
	req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
	req.Header.Set("Content-Type", "application/json")

	// Setup gin context.
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Set("Account-ID", accountID.String())

	h.HandleStreamGenerate(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "thread_done")
}

func TestHandler_HandleStreamGenerate_WithBase64Images(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	describer := NewMockDescriber(ctrl)
	generator := NewMockGenerator(ctrl)
	mockStore := NewMockHandlerStore(ctrl)
	s3 := NewMockS3Fetcher(ctrl)

	// Setup expectations.
	mockStore.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
		Return(store.VoiceProfile{}, nil).
		Times(1)

	// Expect DescribeBatch to be called with media items.
	describer.EXPECT().DescribeBatch(gomock.Any(), gomock.Any()).
		Return([]mediadescriber.Description{
			{
				Index:       1,
				Kind:        mediadescriber.KindImage,
				Description: "a sample image",
				Usable:      true,
			},
		}).
		Times(1)

	// Setup generator stream.
	eventCh := make(chan socialposts.Event, 10)
	eventCh <- socialposts.PhaseEvent{Phase: "generating", Platform: ""}
	eventCh <- socialposts.BaseDoneEvent{Content: "base"}
	eventCh <- socialposts.PlatformDoneEvent{
		Platform: "x",
		Result:   socialposts.SinglePost{PlatformName: "x", Content: "adapted"},
	}
	close(eventCh)

	generator.EXPECT().GenerateStream(gomock.Any(), gomock.Any()).
		Return((<-chan socialposts.Event)(eventCh), nil).
		Times(1)

	h := New(describer, generator, mockStore, s3, logger)

	// Create test request with base64 image.
	w := httptest.NewRecorder()
	body := map[string]any{
		"prompt":       "describe this",
		"platforms":    []string{"x"},
		"content_type": "text",
		"images": []map[string]string{
			{
				"mime_type": "image/png",
				"data":      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
			},
		},
	}
	req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Set("Account-ID", accountID.String())

	h.HandleStreamGenerate(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
}

func TestHandler_HandleStreamGenerate_WithMediaIDs(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	describer := NewMockDescriber(ctrl)
	generator := NewMockGenerator(ctrl)
	mockStore := NewMockHandlerStore(ctrl)
	s3 := NewMockS3Fetcher(ctrl)

	// Setup expectations: GetMediaByIDs should be called.
	mockStore.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
		Return([]store.Media{
			{
				ID:        mediaID,
				AccountID: accountID,
				S3Key:     "media/test.png",
			},
		}, nil).
		Times(1)

	mockStore.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
		Return(store.VoiceProfile{}, nil).
		Times(1)

	// Expect S3 fetch.
	s3.EXPECT().GetFile(gomock.Any(), "media/test.png").
		Return(io.NopCloser(strings.NewReader("fake image data")), "image/png", nil).
		Times(1)

	// Expect DescribeBatch.
	describer.EXPECT().DescribeBatch(gomock.Any(), gomock.Any()).
		Return([]mediadescriber.Description{
			{
				Index:       1,
				Kind:        mediadescriber.KindImage,
				Description: "a fetched image",
				Usable:      true,
			},
		}).
		Times(1)

	// Setup generator stream.
	eventCh := make(chan socialposts.Event, 10)
	eventCh <- socialposts.PhaseEvent{Phase: "generating", Platform: ""}
	eventCh <- socialposts.BaseDoneEvent{Content: "base"}
	eventCh <- socialposts.PlatformDoneEvent{
		Platform: "x",
		Result:   socialposts.SinglePost{PlatformName: "x", Content: "adapted"},
	}
	close(eventCh)

	generator.EXPECT().GenerateStream(gomock.Any(), gomock.Any()).
		Return((<-chan socialposts.Event)(eventCh), nil).
		Times(1)

	h := New(describer, generator, mockStore, s3, logger)

	// Create test request.
	w := httptest.NewRecorder()
	body := map[string]any{
		"prompt":       "with stored media",
		"platforms":    []string{"x"},
		"content_type": "text",
		"media_ids":    []string{mediaID.String()},
	}
	req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Set("Account-ID", accountID.String())

	h.HandleStreamGenerate(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "base_done")
}

func TestHandler_HandleStreamGenerate_GeneratorError(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	describer := NewMockDescriber(ctrl)
	generator := NewMockGenerator(ctrl)
	mockStore := NewMockHandlerStore(ctrl)
	s3 := NewMockS3Fetcher(ctrl)

	mockStore.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
		Return(store.VoiceProfile{}, nil).
		Times(1)

	// Generator stream returns error event.
	eventCh := make(chan socialposts.Event, 1)
	eventCh <- socialposts.ErrorEvent{Err: socialposts.ErrGenerate}
	close(eventCh)

	generator.EXPECT().GenerateStream(gomock.Any(), gomock.Any()).
		Return((<-chan socialposts.Event)(eventCh), nil).
		Times(1)

	h := New(describer, generator, mockStore, s3, logger)

	w := httptest.NewRecorder()
	body := map[string]any{
		"prompt":       "error test",
		"platforms":    []string{"x"},
		"content_type": "text",
	}
	req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Set("Account-ID", accountID.String())

	h.HandleStreamGenerate(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "error")
}

func TestHandler_HandleStreamGenerate_MediaIDsPreferredOverImages(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	mediaID := uuid.New()

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	describer := NewMockDescriber(ctrl)
	generator := NewMockGenerator(ctrl)
	mockStore := NewMockHandlerStore(ctrl)
	s3 := NewMockS3Fetcher(ctrl)

	// When both media_ids and images are provided, media_ids path is taken.
	// GetMediaByIDs should be called, NOT DescribeBatch on base64 images.
	mockStore.EXPECT().GetMediaByIDs(gomock.Any(), gomock.Any()).
		Return([]store.Media{}, nil).
		Times(1)

	// Since we get no valid media, we emit an error event and return early.
	// So GetVoiceProfileByAccount, DescribeBatch, and GenerateStream should NOT be called.

	h := New(describer, generator, mockStore, s3, logger)

	w := httptest.NewRecorder()
	body := map[string]any{
		"prompt":       "both paths",
		"platforms":    []string{"x"},
		"content_type": "text",
		"media_ids":    []string{mediaID.String()},
		"images": []map[string]string{
			{
				"mime_type": "image/png",
				"data":      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
			},
		},
	}
	req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	ctx.Set("Account-ID", accountID.String())

	h.HandleStreamGenerate(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), "error")
}

func TestHandler_ContentTypeNormalization(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct{
		name        string
		contentType string
		wantMode    socialposts.Mode
	}{
		{
			name:        "lowercase single",
			contentType: "single",
			wantMode:    socialposts.ModeSingle,
		},
		{
			name:        "uppercase SINGLE",
			contentType: "SINGLE",
			wantMode:    socialposts.ModeSingle,
		},
		{
			name:        "text alias",
			contentType: "text",
			wantMode:    socialposts.ModeSingle,
		},
		{
			name:        "thread",
			contentType: "thread",
			wantMode:    socialposts.ModeThread,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			describer := NewMockDescriber(ctrl)
			generator := NewMockGenerator(ctrl)
			mockStore := NewMockHandlerStore(ctrl)
			s3 := NewMockS3Fetcher(ctrl)

			mockStore.EXPECT().GetVoiceProfileByAccount(gomock.Any(), accountID).
				Return(store.VoiceProfile{}, nil).
				AnyTimes()

			eventCh := make(chan socialposts.Event, 1)
			close(eventCh)

			generator.EXPECT().GenerateStream(gomock.Any(), gomock.Any()).
				Return((<-chan socialposts.Event)(eventCh), nil).
				Times(1)

			h := New(describer, generator, mockStore, s3, logger)

			w := httptest.NewRecorder()
			body := map[string]any{
				"prompt":       "test",
				"platforms":    []string{"x"},
				"content_type": tt.contentType,
			}
			req := httptest.NewRequest(http.MethodPost, "/content/stream", contentBody(t, body))
			req.Header.Set("Content-Type", "application/json")

			ctx, _ := gin.CreateTestContext(w)
			ctx.Request = req
			ctx.Set("Account-ID", accountID.String())

			h.HandleStreamGenerate(ctx)

			assert.Equal(t, http.StatusOK, w.Code)
		})
	}
}
