package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/settings/processor"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var settingsGinOnce sync.Once

func setupSettingsRouter(h Handler, accountID uuid.UUID) *gin.Engine {
	settingsGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("Account-ID", accountID.String())
		c.Next()
	})
	r.GET("/settings/voice", h.HandleGetVoiceProfile)
	r.PUT("/settings/voice", h.HandleUpdateVoiceProfile)
	r.GET("/settings/site-publish-target", h.HandleGetSitePublishTarget)
	r.PUT("/settings/site-publish-target", h.HandleUpdateSitePublishTarget)
	return r
}

// setupSettingsRouterNoAuth builds a router without the Account-ID middleware, to exercise the
// unauthorized path.
func setupSettingsRouterNoAuth(h Handler) *gin.Engine {
	settingsGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.GET("/settings/site-publish-target", h.HandleGetSitePublishTarget)
	r.PUT("/settings/site-publish-target", h.HandleUpdateSitePublishTarget)
	return r
}

func settingsBody(t *testing.T, v any) *bytes.Buffer {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return bytes.NewBuffer(b)
}

func TestHandler_HandleGetVoiceProfile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockSettingsProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().GetVoiceProfile(gomock.Any(), accountID).
					Return(store.VoiceProfile{ID: uuid.New(), Tone: "casual"}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "404 profile not found",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().GetVoiceProfile(gomock.Any(), accountID).
					Return(store.VoiceProfile{}, processor.ErrVoiceProfileNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().GetVoiceProfile(gomock.Any(), accountID).
					Return(store.VoiceProfile{}, errors.New("db exploded"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockSettingsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupSettingsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodGet, "/settings/voice", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleUpdateVoiceProfile(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockSettingsProcessor)
		body       any
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().UpdateVoiceProfile(gomock.Any(), accountID, "casual", "concise", gomock.Any(), nil, nil, nil).
					Return(store.VoiceProfile{ID: uuid.New(), Tone: "casual"}, nil)
			},
			body: map[string]any{
				"tone":  "casual",
				"style": "concise",
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 missing required fields",
			mocks:      func(m *MockSettingsProcessor) {},
			body:       map[string]any{"tone": "casual"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 profile not found",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().UpdateVoiceProfile(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any(), nil, nil, nil).
					Return(store.VoiceProfile{}, processor.ErrVoiceProfileNotFound)
			},
			body: map[string]any{
				"tone":  "casual",
				"style": "concise",
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().UpdateVoiceProfile(gomock.Any(), accountID, gomock.Any(), gomock.Any(), gomock.Any(), nil, nil, nil).
					Return(store.VoiceProfile{}, errors.New("boom"))
			},
			body: map[string]any{
				"tone":  "casual",
				"style": "concise",
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockSettingsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			router := setupSettingsRouter(h, accountID)

			req := httptest.NewRequest(http.MethodPut, "/settings/voice", settingsBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandleGetSitePublishTarget(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	tests := []struct {
		name       string
		noAuth     bool
		mocks      func(m *MockSettingsProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().GetSitePublishTarget(gomock.Any(), accountID).
					Return(store.SitePublishTarget{
						ID:          uuid.New(),
						AccountID:   accountID,
						RepoOwner:   "acme",
						RepoName:    "site",
						BaseBranch:  "main",
						ContentPath: "content/posts",
					}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "401 unauthorized when account id missing",
			noAuth:     true,
			mocks:      func(m *MockSettingsProcessor) {},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 site publish target not configured",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().GetSitePublishTarget(gomock.Any(), accountID).
					Return(store.SitePublishTarget{}, processor.ErrSitePublishTargetNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on unexpected store error",
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().GetSitePublishTarget(gomock.Any(), accountID).
					Return(store.SitePublishTarget{}, errors.New("db exploded"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockSettingsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			var router *gin.Engine
			if tt.noAuth {
				router = setupSettingsRouterNoAuth(h)
			} else {
				router = setupSettingsRouter(h, accountID)
			}

			req := httptest.NewRequest(http.MethodGet, "/settings/site-publish-target", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandleUpdateSitePublishTarget(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	validBody := map[string]any{
		"repo_owner":   "acme",
		"repo_name":    "site",
		"base_branch":  "main",
		"content_path": "content/posts",
	}

	tests := []struct {
		name       string
		noAuth     bool
		body       any
		mocks      func(m *MockSettingsProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			body: validBody,
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().UpdateSitePublishTarget(gomock.Any(), accountID, "acme", "site", "main", "content/posts").
					Return(store.SitePublishTarget{
						ID:          uuid.New(),
						AccountID:   accountID,
						RepoOwner:   "acme",
						RepoName:    "site",
						BaseBranch:  "main",
						ContentPath: "content/posts",
					}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "400 validation error when repo_owner missing",
			body:       map[string]any{"repo_name": "site", "base_branch": "main", "content_path": "content/posts"},
			mocks:      func(m *MockSettingsProcessor) {},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "401 unauthorized when account id missing",
			noAuth:     true,
			body:       validBody,
			mocks:      func(m *MockSettingsProcessor) {},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "500 on unexpected store error",
			body: validBody,
			mocks: func(m *MockSettingsProcessor) {
				m.EXPECT().UpdateSitePublishTarget(gomock.Any(), accountID, "acme", "site", "main", "content/posts").
					Return(store.SitePublishTarget{}, errors.New("boom"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockSettingsProcessor(ctrl)
			tt.mocks(m)

			h := New(m, logger)
			var router *gin.Engine
			if tt.noAuth {
				router = setupSettingsRouterNoAuth(h)
			} else {
				router = setupSettingsRouter(h, accountID)
			}

			req := httptest.NewRequest(http.MethodPut, "/settings/site-publish-target", settingsBody(t, tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, tt.wantStatus, w.Code)
		})
	}
}
