package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/platform/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var platformGinOnce sync.Once

func setupPlatformRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	platformGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.POST("/platforms/oauth/init", h.HandleInitiateOAuth)
	r.GET("/platforms/oauth/callback/:platform", h.HandleOAuthCallback)
	r.POST("/platforms/token", h.HandleConnectWithToken)
	r.POST("/platforms/bluesky", h.HandleConnectBluesky)
	r.DELETE("/platforms/:id", h.HandleDisconnect)
	r.GET("/platforms", h.HandleListConnections)
	return r
}

func platformBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleInitiateOAuth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPlatformProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().InitiateOAuth(gomock.Any(), accountID, "x").
					Return("https://x.com/oauth/authorize?state=abc", nil)
			},
			body:       map[string]any{"platform": "x"},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing platform",
			mocks:      func(m *MockPlatformProcessor) {},
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 unsupported platform",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().InitiateOAuth(gomock.Any(), accountID, "fakebook").
					Return("", processor.ErrUnsupportedPlatform)
			},
			body:       map[string]any{"platform": "fakebook"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "500 on initiate error",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().InitiateOAuth(gomock.Any(), accountID, "x").
					Return("", processor.ErrInitiateOAuth)
			},
			body:       map[string]any{"platform": "x"},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPlatformProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger, "http://localhost:3000")
			router := setupPlatformRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/platforms/oauth/init", platformBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleOAuthCallback(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPlatformProcessor)
		platform   string
		query      string
		wantStatus int
	}{
		{
			name: "302 happy path redirect",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().HandleOAuthCallback(gomock.Any(), accountID, "x", "some-code").
					Return(store.PlatformConnection{}, nil)
			},
			platform:   "x",
			query:      "?code=some-code&state=" + accountID.String(),
			wantStatus: http.StatusFound,
		},
		{
			name:       "400 missing code",
			mocks:      func(m *MockPlatformProcessor) {},
			platform:   "x",
			query:      "?state=" + accountID.String(),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing state",
			mocks:      func(m *MockPlatformProcessor) {},
			platform:   "x",
			query:      "?code=some-code",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 invalid state UUID",
			mocks:      func(m *MockPlatformProcessor) {},
			platform:   "x",
			query:      "?code=some-code&state=not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "302 redirect with error on callback failure",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().HandleOAuthCallback(gomock.Any(), accountID, "x", "bad-code").
					Return(store.PlatformConnection{}, processor.ErrHandleOAuthCallback)
			},
			platform:   "x",
			query:      "?code=bad-code&state=" + accountID.String(),
			wantStatus: http.StatusFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPlatformProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger, "http://localhost:3000")
			router := setupPlatformRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/platforms/oauth/callback/"+tt.platform+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleConnectBluesky(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPlatformProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "201 happy path",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().ConnectBluesky(gomock.Any(), accountID, "alice.bsky.social", "app-password").
					Return(store.PlatformConnection{ID: uuid.New()}, nil)
			},
			body:       map[string]any{"handle": "alice.bsky.social", "app_password": "app-password"},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "400 missing fields",
			mocks:      func(m *MockPlatformProcessor) {},
			body:       map[string]any{"handle": "alice.bsky.social"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "409 already connected",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().ConnectBluesky(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(store.PlatformConnection{}, processor.ErrAlreadyConnected)
			},
			body:       map[string]any{"handle": "alice.bsky.social", "app_password": "pass"},
			wantStatus: http.StatusConflict,
		},
		{
			name: "500 on connect error",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().ConnectBluesky(gomock.Any(), accountID, gomock.Any(), gomock.Any()).
					Return(store.PlatformConnection{}, processor.ErrConnectBluesky)
			},
			body:       map[string]any{"handle": "alice.bsky.social", "app_password": "pass"},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPlatformProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger, "http://localhost:3000")
			router := setupPlatformRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPost, "/platforms/bluesky", platformBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDisconnectPlatform(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	connID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPlatformProcessor)
		connID     string
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().DisconnectPlatform(gomock.Any(), accountID, connID).Return(nil)
			},
			connID:     connID.String(),
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 invalid UUID",
			mocks:      func(m *MockPlatformProcessor) {},
			connID:     "bad",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 connection not found",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().DisconnectPlatform(gomock.Any(), accountID, connID).Return(processor.ErrConnectionNotFound)
			},
			connID:     connID.String(),
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on disconnect error",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().DisconnectPlatform(gomock.Any(), accountID, connID).Return(processor.ErrDisconnectPlatform)
			},
			connID:     connID.String(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPlatformProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger, "http://localhost:3000")
			router := setupPlatformRouter(h, accountID)

			req := httptest.NewRequest(http.MethodDelete, "/platforms/"+tt.connID, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleListConnections(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockPlatformProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().ListConnections(gomock.Any(), accountID).
					Return([]store.PlatformConnection{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on list error",
			mocks: func(m *MockPlatformProcessor) {
				m.EXPECT().ListConnections(gomock.Any(), accountID).
					Return(nil, processor.ErrListConnections)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockPlatformProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger, "http://localhost:3000")
			router := setupPlatformRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/platforms", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
