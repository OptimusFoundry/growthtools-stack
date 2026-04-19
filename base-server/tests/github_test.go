//go:build integration

package tests

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"testing"
	"time"

	"base-server/internal/infra/store"
	"base-server/tests/testenv"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGitHubAPI_GetConnection tests GET /api/protected/github/connection.
func TestGitHubAPI_GetConnection(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns the connection",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.GitHubConnection
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotEqual(t, uuid.Nil, got.ID)
				assert.Equal(t, "testuser", got.GitHubUsername)
			},
		},
		{
			name: "404 when no connection exists",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/github/connection", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// TestGitHubAPI_Disconnect tests DELETE /api/protected/github/connection.
func TestGitHubAPI_Disconnect(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token string, userID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, userID uuid.UUID)
	}{
		{
			name: "204 soft-deletes the connection",
			setup: func(t *testing.T) (string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				return u.Token, u.UserID
			},
			wantStatus: http.StatusNoContent,
			afterAssert: func(t *testing.T, userID uuid.UUID) {
				_, err := c.Store.GetGitHubConnectionByUserID(context.Background(), userID)
				assert.ErrorIs(t, err, store.ErrNotFound)
			},
		},
		{
			name: "404 when no connection exists",
			setup: func(t *testing.T) (string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, u.UserID
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, uuid.UUID) {
				return "", uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, userID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodDelete, "/api/protected/github/connection", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusNoContent {
				tt.afterAssert(t, userID)
			}
		})
	}
}

// TestGitHubAPI_ListCommits tests GET /api/protected/github/commits.
func TestGitHubAPI_ListCommits(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty page when connection has no repos",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got struct {
					Commits []store.GitHubCommitSummary `json:"commits"`
					Total   int                         `json:"total"`
					Limit   int                         `json:"limit"`
					Offset  int                         `json:"offset"`
				}
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got.Commits)
				assert.Empty(t, got.Commits)
				assert.Equal(t, 0, got.Total)
			},
		},
		{
			name: "404 when no connection exists",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/github/commits", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// TestGitHubAPI_GetCommit tests GET /api/protected/github/commits/:id.
func TestGitHubAPI_GetCommit(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, path string)
		wantStatus int
	}{
		{
			name: "200 returns the commit when owned by user",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, u.UserID)
				commit := seedGitHubCommit(t, c.Store, conn.ID)
				return u.Token, "/api/protected/github/commits/" + commit.ID.String()
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "404 when commit belongs to a different user",
			setup: func(t *testing.T) (string, string) {
				owner := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, owner.UserID)
				commit := seedGitHubCommit(t, c.Store, conn.ID)
				stranger := seedUserWithAccount(t, c.Store)
				return stranger.Token, "/api/protected/github/commits/" + commit.ID.String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when commit does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "/api/protected/github/commits/" + uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "400 when id is not a uuid",
			setup: func(t *testing.T) (string, string) {
				return seedUserWithAccount(t, c.Store).Token, "/api/protected/github/commits/not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/github/commits/" + uuid.New().String()
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, _ := c.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestGitHubAPI_Webhook tests POST /api/github/webhook (public, signature-verified).
func TestGitHubAPI_Webhook(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (payload []byte, headers map[string]string)
		wantStatus int
	}{
		{
			name: "400 when required headers are missing",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				// Provide no GitHub-specific headers.
				return []byte(`{}`), map[string]string{}
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when signature is invalid",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"push"}`)
				return payload, map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": "sha256=invalidsignature000000000000000000000000000000000000000000000000",
				}
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "401 when payload is signed with wrong secret (no matching repo)",
			setup: func(t *testing.T) ([]byte, map[string]string) {
				payload := []byte(`{"action":"push","repository":{"id":99999999}}`)
				secret := "wrong-secret"
				mac := hmac.New(sha256.New, []byte(secret))
				mac.Write(payload)
				sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))
				return payload, map[string]string{
					"X-GitHub-Event":      "push",
					"X-GitHub-Delivery":   uuid.New().String(),
					"X-Hub-Signature-256": sig,
				}
			},
			// The processor looks up the repo by github_repo_id=99999999 to
			// find the per-repo webhook_secret and validate the signature.
			// Since no such repo exists, the processor returns ErrInvalidSignature
			// (it cannot validate without the secret) → handler returns 401.
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			payload, headers := tt.setup(t)
			req, err := http.NewRequest(http.MethodPost, c.baseURL+"/api/github/webhook",
				bytes.NewReader(payload))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")
			for k, v := range headers {
				req.Header.Set(k, v)
			}

			resp, err := c.http.Do(req)
			require.NoError(t, err)
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// ============================================================================
// Helpers for GitHub tests
// ============================================================================

// seedGitHubCommit creates a repo + commit scoped to the given connection.
// Returns the commit row so tests can reference its id.
func seedGitHubCommit(t *testing.T, s *store.Store, connID uuid.UUID) store.GitHubCommit {
	t.Helper()
	ctx := context.Background()
	ghRepoID := int64(2000000000) + int64(uuid.New().ID())
	defaultBranch := "main"
	repo, err := s.CreateGitHubRepo(ctx, connID, ghRepoID, "owner", "repo-"+uuid.New().String()[:8], &defaultBranch, nil, "hook-secret")
	require.NoError(t, err)

	sha := "sha-" + uuid.New().String()
	commit, _, err := s.InsertGitHubCommit(ctx, repo.ID, sha, nil, nil, "msg", nil, nil, time.Now().UTC(), nil)
	require.NoError(t, err)
	return commit
}

// seedGitHubConnection creates a fake GitHub connection row for userID.
func seedGitHubConnection(t *testing.T, s *store.Store, userID uuid.UUID) store.GitHubConnection {
	t.Helper()
	// Use a random numeric user ID to avoid conflicts.
	ghUserID := int64(1000000000) + int64(uuid.New().ID())
	conn, err := s.CreateOrUpdateGitHubConnection(
		context.Background(),
		userID,
		ghUserID,
		"testuser",
		"fake-gh-token",
		"repo,user",
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`UPDATE github_connections SET deleted_at = NOW() WHERE id = $1`, conn.ID)
	})
	return conn
}

// TestGitHubAPI_InitOAuth tests GET /api/protected/github/oauth/init.
// No upstream call — just generates an authorization URL.
func TestGitHubAPI_InitOAuth(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns authorize_url",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got map[string]any
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotEmpty(t, got["authorize_url"])
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/github/oauth/init", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// TestGitHubAPI_OAuthCallback tests GET /api/github/oauth/callback (public, redirects).
// Success path requires calling InitOAuth first to store state.
func TestGitHubAPI_OAuthCallback(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	env := testenv.GlobalEnv

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	tests := []struct {
		name            string
		setup           func(t *testing.T) (code, state string)
		wantStatus      int
		wantLocationSub string
	}{
		{
			name: "400 when code is missing",
			setup: func(t *testing.T) (string, string) {
				return "", "some-state"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when state is missing",
			setup: func(t *testing.T) (string, string) {
				return "some-code", ""
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "302 to error when state not found (init never called)",
			setup: func(t *testing.T) (string, string) {
				return "some-code", "nonexistent-state-" + uuid.New().String()
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "github=error",
		},
		{
			name: "302 to error when token exchange fails",
			setup: func(t *testing.T) (string, string) {
				// Call InitOAuth to get a valid state.
				u := seedUserWithAccount(t, c.Store)
				resp, body := c.Request(t, http.MethodGet, "/api/protected/github/oauth/init", nil, u.Token)
				require.Equal(t, http.StatusOK, resp.StatusCode)
				var got map[string]any
				require.NoError(t, json.Unmarshal(body, &got))
				authorizeURL, _ := got["authorize_url"].(string)
				// Extract state from URL.
				state := extractQueryParam(t, authorizeURL, "state")
				env.GitHub.ExpectOAuthTokenExchange(t).
					ReturnStatus(http.StatusBadRequest).
					Times(1, t)
				return "bad-code", state
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "github=error",
		},
		{
			name: "302 to connected on successful OAuth",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				resp, body := c.Request(t, http.MethodGet, "/api/protected/github/oauth/init", nil, u.Token)
				require.Equal(t, http.StatusOK, resp.StatusCode)
				var got map[string]any
				require.NoError(t, json.Unmarshal(body, &got))
				authorizeURL, _ := got["authorize_url"].(string)
				state := extractQueryParam(t, authorizeURL, "state")
				env.GitHub.ExpectOAuthTokenExchange(t).
					ReturnJSON(http.StatusOK, map[string]any{
						"access_token": "ghu_fakegithubtoken",
						"scope":        "repo,user",
						"token_type":   "bearer",
					}).Times(1, t)
				env.GitHub.ExpectGetAuthenticatedUser(t).
					ReturnJSON(http.StatusOK, map[string]any{
						"id":    12345678,
						"login": "testghuser",
					}).Times(1, t)
				return "valid-code", state
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "github=connected",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			code, state := tt.setup(t)

			urlStr := env.BaseURL + "/api/github/oauth/callback?"
			sep := ""
			if code != "" {
				urlStr += "code=" + code
				sep = "&"
			}
			if state != "" {
				urlStr += sep + "state=" + state
			}

			req, err := http.NewRequest(http.MethodGet, urlStr, nil)
			require.NoError(t, err)
			resp, err := noRedirectClient.Do(req)
			require.NoError(t, err)
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantLocationSub != "" {
				assert.Contains(t, resp.Header.Get("Location"), tt.wantLocationSub)
			}
		})
	}
}

// TestGitHubAPI_ListRepos tests GET /api/protected/github/repos.
func TestGitHubAPI_ListRepos(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	env := testenv.GlobalEnv

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty list when no repos connected",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				env.GitHub.ExpectListUserRepos(t).
					ReturnJSON(http.StatusOK, []map[string]any{}).
					Times(1, t)
				return u.Token
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "200 returns repos from GitHub",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				env.GitHub.ExpectListUserRepos(t).
					ReturnJSON(http.StatusOK, []map[string]any{
						{
							"id":             123456789,
							"name":           "my-repo",
							"owner":          map[string]any{"login": "testowner"},
							"private":        false,
							"default_branch": "main",
							"updated_at":     "2026-01-01T00:00:00Z",
						},
					}).Times(1, t)
				return u.Token
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when no GitHub connection",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 when GitHub API returns 500",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				env.GitHub.ExpectListUserRepos(t).
					ReturnStatus(http.StatusInternalServerError).
					Times(1, t)
				return u.Token
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodGet, "/api/protected/github/repos", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// TestGitHubAPI_ConnectRepo tests POST /api/protected/github/repos/:owner/:name/connect.
func TestGitHubAPI_ConnectRepo(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	env := testenv.GlobalEnv

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		owner      string
		repoName   string
		wantStatus int
	}{
		{
			name: "201 creates webhook and connects repo",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				env.GitHub.ExpectCreateWebhook(t, "testowner", "my-repo").
					ReturnJSON(http.StatusCreated, map[string]any{
						"id":     999888777,
						"active": true,
					}).Times(1, t)
				return u.Token
			},
			owner:      "testowner",
			repoName:   "my-repo",
			wantStatus: http.StatusCreated,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) string {
				return ""
			},
			owner:      "testowner",
			repoName:   "my-repo",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when no GitHub connection",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			owner:      "testowner",
			repoName:   "my-repo",
			wantStatus: http.StatusNotFound,
		},
		{
			name: "500 when webhook creation fails",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				env.GitHub.ExpectCreateWebhook(t, "testowner", "my-repo").
					ReturnStatus(http.StatusUnprocessableEntity).
					Times(1, t)
				return u.Token
			},
			owner:      "testowner",
			repoName:   "my-repo",
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			path := "/api/protected/github/repos/" + tt.owner + "/" + tt.repoName + "/connect"
			resp, _ := c.Request(t, http.MethodPost, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestGitHubAPI_DisconnectRepo tests DELETE /api/protected/github/repos/:owner/:name.
func TestGitHubAPI_DisconnectRepo(t *testing.T) {
	t.Parallel()
	c := testClient(t)
	env := testenv.GlobalEnv

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, owner, repoName string)
		wantStatus int
	}{
		{
			name: "204 deletes webhook and disconnects repo",
			setup: func(t *testing.T) (string, string, string) {
				u := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, u.UserID)
				hookID := int64(42)
				seedGitHubRepo(t, c.Store, conn.ID, "testowner", "my-repo", &hookID)
				env.GitHub.ExpectDeleteWebhook(t, "testowner", "my-repo", hookID).
					ReturnStatus(http.StatusNoContent).
					Times(1, t)
				return u.Token, "testowner", "my-repo"
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "204 succeeds even when repo has no webhook ID",
			setup: func(t *testing.T) (string, string, string) {
				u := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, u.UserID)
				seedGitHubRepo(t, c.Store, conn.ID, "testowner", "no-hook-repo", nil)
				return u.Token, "testowner", "no-hook-repo"
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, string) {
				return "", "testowner", "my-repo"
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when no GitHub connection",
			setup: func(t *testing.T) (string, string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "testowner", "my-repo"
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when repo not found",
			setup: func(t *testing.T) (string, string, string) {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				return u.Token, "testowner", "nonexistent-repo"
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, owner, repoName := tt.setup(t)
			path := "/api/protected/github/repos/" + owner + "/" + repoName
			resp, _ := c.Request(t, http.MethodDelete, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestGitHubAPI_RetryCapture tests POST /api/protected/github/commits/:id/retry-capture.
// No synchronous upstream call — publishes to Kafka (best-effort).
func TestGitHubAPI_RetryCapture(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token, commitID string)
		wantStatus int
	}{
		{
			name: "202 queues commit for retry",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, u.UserID)
				commit := seedGitHubCommit(t, c.Store, conn.ID)
				return u.Token, commit.ID.String()
			},
			wantStatus: http.StatusAccepted,
		},
		{
			name: "400 when commit ID is not a UUID",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", uuid.New().String()
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "404 when commit does not exist",
			setup: func(t *testing.T) (string, string) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String()
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when commit belongs to another user",
			setup: func(t *testing.T) (string, string) {
				owner := seedUserWithAccount(t, c.Store)
				conn := seedGitHubConnection(t, c.Store, owner.UserID)
				commit := seedGitHubCommit(t, c.Store, conn.ID)
				stranger := seedUserWithAccount(t, c.Store)
				return stranger.Token, commit.ID.String()
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, commitIDStr := tt.setup(t)
			resp, _ := c.Request(t, http.MethodPost,
				"/api/protected/github/commits/"+commitIDStr+"/retry-capture", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// seedGitHubRepo creates a github repo row for integration tests.
// hookID may be nil if no webhook was created.
func seedGitHubRepo(t *testing.T, s *store.Store, connID uuid.UUID, owner, name string, hookID *int64) store.GitHubRepo {
	t.Helper()
	ctx := context.Background()
	ghRepoID := int64(3000000000) + int64(uuid.New().ID())
	defaultBranch := "main"
	repo, err := s.CreateGitHubRepo(ctx, connID, ghRepoID, owner, name, &defaultBranch, hookID, "webhook-secret-"+uuid.New().String()[:8])
	require.NoError(t, err)
	t.Cleanup(func() {
		_, _ = s.GetDB().ExecContext(context.Background(),
			`DELETE FROM github_repos WHERE id = $1`, repo.ID)
	})
	return repo
}

// extractQueryParam parses a URL string and returns the value of the given query param.
func extractQueryParam(t *testing.T, rawURL, param string) string {
	t.Helper()
	u, err := url.Parse(rawURL)
	require.NoError(t, err, "failed to parse URL: %s", rawURL)
	return u.Query().Get(param)
}
