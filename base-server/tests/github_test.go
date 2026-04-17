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
	"testing"

	"base-server/internal/infra/store"

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
			name: "200 returns empty list when connection has no repos",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedGitHubConnection(t, c.Store, u.UserID)
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.GitHubCommit
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
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

// The following GitHub endpoints are OUT OF SCOPE because they call GitHub API:
//
//   GET  /api/protected/github/oauth/init                   — OAuth URL generation
//   GET  /api/github/oauth/callback                         — code exchange
//   GET  /api/protected/github/repos                        — lists repos from GitHub
//   POST /api/protected/github/repos/:owner/:name/connect   — registers GitHub webhook
//   DELETE /api/protected/github/repos/:owner/:name         — deletes GitHub webhook
