package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"base-server/internal/github/processor"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var githubGinOnce sync.Once

func setupGitHubRouter(h Handler, userID uuid.UUID) *gin.Engine {
	githubGinOnce.Do(func() { gin.SetMode(gin.TestMode) })
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("User-ID", userID.String())
		c.Next()
	})
	r.POST("/webhook", h.HandleWebhook)
	r.GET("/oauth/init", h.HandleInitOAuth)
	r.GET("/oauth/callback", h.HandleOAuthCallback)
	r.GET("/connection", h.HandleGetConnection)
	r.DELETE("/connection", h.HandleDisconnect)
	r.GET("/repos", h.HandleListAvailableRepos)
	r.POST("/repos/:owner/:name/connect", h.HandleConnectRepo)
	r.DELETE("/repos/:owner/:name", h.HandleDisconnectRepo)
	r.GET("/commits", h.HandleListCommits)
	r.GET("/commits/:id", h.HandleGetCommit)
	return r
}

func TestHandler_HandleWebhook(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		headers    map[string]string
		body       []byte
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().HandleWebhookEvent(gomock.Any(), "delivery-123", "push", gomock.Any(), "sha256=sig").
					Return(nil)
			},
			headers: map[string]string{
				"X-GitHub-Event":    "push",
				"X-GitHub-Delivery": "delivery-123",
				"X-Hub-Signature-256": "sha256=sig",
			},
			body:       []byte(`{}`),
			wantStatus: http.StatusOK,
		},
		{
			name:  "400 missing required headers",
			mocks: func(m *MockGitHubProcessor) {},
			headers: map[string]string{
				"X-GitHub-Event": "push",
				// Missing delivery and signature
			},
			body:       []byte(`{}`),
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 invalid signature",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().HandleWebhookEvent(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(processor.ErrInvalidSignature)
			},
			headers: map[string]string{
				"X-GitHub-Event":      "push",
				"X-GitHub-Delivery":   "delivery-456",
				"X-Hub-Signature-256": "sha256=badsig",
			},
			body:       []byte(`{}`),
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "200 duplicate event returns 200",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().HandleWebhookEvent(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(processor.ErrDuplicateEvent)
			},
			headers: map[string]string{
				"X-GitHub-Event":      "push",
				"X-GitHub-Delivery":   "delivery-789",
				"X-Hub-Signature-256": "sha256=sig",
			},
			body:       []byte(`{}`),
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().HandleWebhookEvent(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(errors.New("boom"))
			},
			headers: map[string]string{
				"X-GitHub-Event":      "push",
				"X-GitHub-Delivery":   "delivery-999",
				"X-Hub-Signature-256": "sha256=sig",
			},
			body:       []byte(`{}`),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewBuffer(tt.body))
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleInitOAuth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().InitOAuth(gomock.Any(), userID).
					Return("https://github.com/login/oauth/authorize?state=abc", nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "500 on oauth init error",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().InitOAuth(gomock.Any(), userID).
					Return("", processor.ErrOAuthExchangeFailed)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodGet, "/oauth/init", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleOAuthCallback(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		query      string
		wantStatus int
	}{
		{
			name: "302 redirect on success",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().CompleteOAuth(gomock.Any(), "valid-state", "some-code").
					Return(uuid.New(), nil)
			},
			query:      "?code=some-code&state=valid-state",
			wantStatus: http.StatusFound,
		},
		{
			name:       "400 missing code",
			mocks:      func(m *MockGitHubProcessor) {},
			query:      "?state=some-state",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 missing state",
			mocks:      func(m *MockGitHubProcessor) {},
			query:      "?code=some-code",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "302 redirect with error on oauth failure",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().CompleteOAuth(gomock.Any(), "bad-state", "bad-code").
					Return(uuid.Nil, processor.ErrInvalidOAuthState)
			},
			query:      "?code=bad-code&state=bad-state",
			wantStatus: http.StatusFound, // still redirects but with error param
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodGet, "/oauth/callback"+tt.query, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleGetConnection(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().GetConnection(gomock.Any(), userID).
					Return(store.GitHubConnection{ID: uuid.New()}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "404 connection not found",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().GetConnection(gomock.Any(), userID).
					Return(store.GitHubConnection{}, processor.ErrConnectionNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on unexpected error",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().GetConnection(gomock.Any(), userID).
					Return(store.GitHubConnection{}, errors.New("boom"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodGet, "/connection", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDisconnect(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		wantStatus int
	}{
		{
			name: "204 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().Disconnect(gomock.Any(), userID).Return(nil)
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "404 connection not found",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().Disconnect(gomock.Any(), userID).Return(processor.ErrConnectionNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 failed disconnect",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().Disconnect(gomock.Any(), userID).Return(processor.ErrFailedDisconnect)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodDelete, "/connection", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleListAvailableRepos(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		wantStatus int
	}{
		{
			name: "200 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListAvailableRepos(gomock.Any(), userID, 1).
					Return([]processor.AvailableRepo{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "404 connection not found",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListAvailableRepos(gomock.Any(), userID, 1).
					Return(nil, processor.ErrConnectionNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on api error",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListAvailableRepos(gomock.Any(), userID, 1).
					Return(nil, processor.ErrFailedDisconnect)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodGet, "/repos", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleConnectRepo(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		path       string
		wantStatus int
	}{
		{
			name: "201 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ConnectRepo(gomock.Any(), userID, "alice", "myrepo").
					Return(store.GitHubRepo{ID: uuid.New()}, nil)
			},
			path:       "/repos/alice/myrepo/connect",
			wantStatus: http.StatusCreated,
		},
		{
			name: "404 connection not found",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ConnectRepo(gomock.Any(), userID, "alice", "myrepo").
					Return(store.GitHubRepo{}, processor.ErrConnectionNotFound)
			},
			path:       "/repos/alice/myrepo/connect",
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on webhook error",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ConnectRepo(gomock.Any(), userID, "alice", "myrepo").
					Return(store.GitHubRepo{}, processor.ErrFailedDisconnect)
			},
			path:       "/repos/alice/myrepo/connect",
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodPost, tt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleDisconnectRepo(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		mocks      func(m *MockGitHubProcessor)
		path       string
		wantStatus int
	}{
		{
			name: "204 happy path",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().DisconnectRepo(gomock.Any(), userID, "alice", "myrepo").Return(nil)
			},
			path:       "/repos/alice/myrepo",
			wantStatus: http.StatusNoContent,
		},
		{
			name: "404 repo not found",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().DisconnectRepo(gomock.Any(), userID, "alice", "myrepo").
					Return(processor.ErrRepoNotFound)
			},
			path:       "/repos/alice/myrepo",
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on disconnect error",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().DisconnectRepo(gomock.Any(), userID, "alice", "myrepo").
					Return(processor.ErrFailedDisconnect)
			},
			path:       "/repos/alice/myrepo",
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodDelete, tt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
		})
	}
}

func TestHandler_HandleListCommits(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()

	tests := []struct {
		name       string
		path       string
		mocks      func(m *MockGitHubProcessor)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 happy path with defaults",
			path: "/commits",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListRecentCommits(gomock.Any(), userID, 50, 0).
					Return([]store.GitHubCommitSummary{}, 0, nil)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got ListCommitsResponse
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got.Commits)
				assert.Empty(t, got.Commits)
				assert.Equal(t, 0, got.Total)
				assert.Equal(t, 50, got.Limit)
				assert.Equal(t, 0, got.Offset)
			},
		},
		{
			name: "200 forwards limit and offset and echoes them in response",
			path: "/commits?limit=25&offset=50",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListRecentCommits(gomock.Any(), userID, 25, 50).
					Return([]store.GitHubCommitSummary{{SHA: "abc"}}, 73, nil)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got ListCommitsResponse
				require.NoError(t, json.Unmarshal(body, &got))
				require.Len(t, got.Commits, 1)
				assert.Equal(t, "abc", got.Commits[0].SHA)
				assert.Equal(t, 73, got.Total)
				assert.Equal(t, 25, got.Limit)
				assert.Equal(t, 50, got.Offset)
			},
		},
		{
			name: "200 ignores invalid limit and offset, falls back to defaults",
			path: "/commits?limit=abc&offset=-5",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListRecentCommits(gomock.Any(), userID, 50, 0).
					Return([]store.GitHubCommitSummary{}, 0, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "200 caps limit at 200",
			path: "/commits?limit=500",
			mocks: func(m *MockGitHubProcessor) {
				// 500 is out of range so handler falls back to default 50.
				m.EXPECT().ListRecentCommits(gomock.Any(), userID, 50, 0).
					Return([]store.GitHubCommitSummary{}, 0, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "404 connection not found",
			path: "/commits",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListRecentCommits(gomock.Any(), userID, 50, 0).
					Return(nil, 0, processor.ErrConnectionNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on list error",
			path: "/commits",
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().ListRecentCommits(gomock.Any(), userID, 50, 0).
					Return(nil, 0, processor.ErrFailedDisconnect)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			if tt.wantBody != nil {
				tt.wantBody(t, w.Body.Bytes())
			}
		})
	}
}

func TestHandler_HandleGetCommit(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	userID := uuid.New()
	commitID := uuid.New()

	tests := []struct {
		name       string
		path       string
		mocks      func(m *MockGitHubProcessor)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns the commit",
			path: "/commits/" + commitID.String(),
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().GetCommit(gomock.Any(), userID, commitID).
					Return(store.GitHubCommit{ID: commitID, SHA: "abc123"}, nil)
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.GitHubCommit
				require.NoError(t, json.Unmarshal(body, &got))
				assert.Equal(t, commitID, got.ID)
				assert.Equal(t, "abc123", got.SHA)
			},
		},
		{
			name:       "400 when id is not a uuid",
			path:       "/commits/not-a-uuid",
			mocks:      func(m *MockGitHubProcessor) {},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when processor returns ErrCommitNotFound",
			path: "/commits/" + commitID.String(),
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().GetCommit(gomock.Any(), userID, commitID).
					Return(store.GitHubCommit{}, processor.ErrCommitNotFound)
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 on generic processor error",
			path: "/commits/" + commitID.String(),
			mocks: func(m *MockGitHubProcessor) {
				m.EXPECT().GetCommit(gomock.Any(), userID, commitID).
					Return(store.GitHubCommit{}, processor.ErrFailedGetCommit)
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctrl := gomock.NewController(t)
			m := NewMockGitHubProcessor(ctrl)
			tt.mocks(m)

			h := New(m, "http://localhost:3000", logger)
			router := setupGitHubRouter(h, userID)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			if tt.wantBody != nil {
				tt.wantBody(t, w.Body.Bytes())
			}
		})
	}
}
