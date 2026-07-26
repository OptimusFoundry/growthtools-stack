//go:build integration

package tests

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"base-server/internal/infra/store"
	"base-server/tests/testenv"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// GET /api/protected/platforms — list connections (DB read only, in scope).

func TestPlatformsAPI_ListConnections(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty list for fresh account",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
			},
		},
		{
			name: "200 returns seeded platform connection",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				seedPlatformConnection(t, c.Store, u.AccountID, "x")
				return u.Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.PlatformConnection
				require.NoError(t, json.Unmarshal(body, &got))
				require.GreaterOrEqual(t, len(got), 1)
				assert.Equal(t, "x", got[0].Platform)
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
			resp, body := c.Request(t, http.MethodGet, "/api/protected/platforms", nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// DELETE /api/protected/platforms/:id — in scope (pure DB soft-delete).

func TestPlatformsAPI_Disconnect(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name        string
		setup       func(t *testing.T) (token, connID string, accountID uuid.UUID)
		wantStatus  int
		afterAssert func(t *testing.T, accountID, connID uuid.UUID)
	}{
		{
			name: "200 soft-deletes the connection",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				conn := seedPlatformConnection(t, c.Store, u.AccountID, "linkedin")
				return u.Token, conn.ID.String(), u.AccountID
			},
			wantStatus: http.StatusOK,
			afterAssert: func(t *testing.T, accountID, connID uuid.UUID) {
				_, err := c.Store.GetPlatformConnectionByID(context.Background(), accountID, connID)
				assert.ErrorIs(t, err, store.ErrNotFound, "connection should be soft-deleted")
			},
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				return "", uuid.New().String(), uuid.Nil
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "400 when connection id is not a uuid",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, "not-a-uuid", u.AccountID
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "404 when connection does not exist",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				u := seedUserWithAccount(t, c.Store)
				return u.Token, uuid.New().String(), u.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name: "404 when connection belongs to another account",
			setup: func(t *testing.T) (string, string, uuid.UUID) {
				me := seedUserWithAccount(t, c.Store)
				them := seedUserWithAccount(t, c.Store)
				theirConn := seedPlatformConnection(t, c.Store, them.AccountID, "x")
				return me.Token, theirConn.ID.String(), me.AccountID
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, connIDStr, accountID := tt.setup(t)
			resp, _ := c.Request(t, http.MethodDelete, "/api/protected/platforms/"+connIDStr, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.afterAssert != nil && resp.StatusCode == http.StatusOK {
				connID, err := uuid.Parse(connIDStr)
				require.NoError(t, err)
				tt.afterAssert(t, accountID, connID)
			}
		})
	}
}

// TestPlatformsAPI_InitiateOAuth tests POST /api/protected/platforms/oauth/init.
// No upstream call — just builds an OAuth URL from config.
func TestPlatformsAPI_InitiateOAuth(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		body       any
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns auth_url for linkedin",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"platform": "linkedin"},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got map[string]any
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotEmpty(t, got["auth_url"])
			},
		},
		{
			name: "200 returns auth_url for x (PKCE)",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"platform": "x"},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got map[string]any
				require.NoError(t, json.Unmarshal(body, &got))
				authURL, ok := got["auth_url"].(string)
				assert.True(t, ok)
				assert.Contains(t, authURL, "code_challenge")
			},
		},
		{
			name: "400 when platform field is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 for unsupported platform",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"platform": "unsupported_platform_xyz"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no JWT",
			setup: func(t *testing.T) string {
				return ""
			},
			body:       map[string]any{"platform": "linkedin"},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, body := c.Request(t, http.MethodPost, "/api/protected/platforms/oauth/init", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

// TestPlatformsAPI_OAuthCallback_LinkedIn tests GET /api/platforms/oauth/callback/linkedin.
// The LinkedIn token URL is configurable (via LINKEDIN_API_BASE), so token exchange is mockable.
func TestPlatformsAPI_OAuthCallback_LinkedIn(t *testing.T) {
	t.Parallel()
	env := testenv.GlobalEnv
	c := testClient(t)

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	tests := []struct {
		name            string
		queryParams     map[string]string
		noState         bool // when true, do NOT inject state automatically
		setup           func(t *testing.T, accountID uuid.UUID)
		wantStatus      int
		wantLocationSub string // substring expected in Location header
	}{
		{
			name: "400 when code is missing",
			queryParams: map[string]string{
				"state": uuid.New().String(),
			},
			setup:      func(t *testing.T, _ uuid.UUID) {},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:        "400 when state is missing",
			queryParams: map[string]string{"code": "some-code"},
			noState:     true,
			setup:       func(t *testing.T, _ uuid.UUID) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name: "400 when state is not a UUID",
			queryParams: map[string]string{
				"code":  "some-code",
				"state": "not-a-uuid",
			},
			setup:      func(t *testing.T, _ uuid.UUID) {},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "302 to error when token exchange fails",
			queryParams: map[string]string{
				"code": "bad-code",
			},
			setup: func(t *testing.T, _ uuid.UUID) {
				env.LinkedIn.ExpectOAuthToken(t).
					ReturnStatus(http.StatusBadRequest).
					Times(1, t)
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "error=linkedin",
		},
		{
			name: "302 to connected when token exchange succeeds",
			queryParams: map[string]string{
				"code": "valid-code",
			},
			setup: func(t *testing.T, _ uuid.UUID) {
				env.LinkedIn.ExpectOAuthToken(t).
					ReturnJSON(http.StatusOK, map[string]any{
						"access_token": "li-access-token",
						"token_type":   "Bearer",
						"expires_in":   3600,
					}).Times(1, t)
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "connected=linkedin",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			accountIDStr := u.AccountID.String()

			urlStr := env.BaseURL + "/api/platforms/oauth/callback/linkedin?"
			params := make([]string, 0)
			// Inject accountID as state unless the test explicitly requests no state.
			if !tt.noState {
				if _, has := tt.queryParams["state"]; !has {
					params = append(params, "state="+accountIDStr)
				}
			}
			for k, v := range tt.queryParams {
				params = append(params, k+"="+v)
			}
			for i, p := range params {
				if i == 0 {
					urlStr += p
				} else {
					urlStr += "&" + p
				}
			}

			tt.setup(t, u.AccountID)

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

// TestPlatformsAPI_OAuthCallback_Threads tests GET /api/platforms/oauth/callback/threads.
// The Threads token URL is configurable (via THREADS_API_BASE), so token exchange is mockable.
func TestPlatformsAPI_OAuthCallback_Threads(t *testing.T) {
	t.Parallel()
	env := testenv.GlobalEnv
	c := testClient(t)

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	tests := []struct {
		name            string
		queryParams     map[string]string
		noState         bool // when true, do NOT inject state automatically
		setup           func(t *testing.T)
		wantStatus      int
		wantLocationSub string
	}{
		{
			name:        "400 when code is missing",
			queryParams: map[string]string{"state": uuid.New().String()},
			setup:       func(t *testing.T) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "400 when state is missing",
			queryParams: map[string]string{"code": "some-code"},
			noState:     true,
			setup:       func(t *testing.T) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "400 when state is not a UUID",
			queryParams: map[string]string{"code": "some-code", "state": "not-a-uuid"},
			setup:       func(t *testing.T) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "302 to error when token exchange fails",
			queryParams: map[string]string{"code": "bad-code"},
			setup: func(t *testing.T) {
				env.Threads.ExpectOAuthToken(t).
					ReturnStatus(http.StatusBadRequest).
					Times(1, t)
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "error=threads",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			accountIDStr := u.AccountID.String()

			urlStr := env.BaseURL + "/api/platforms/oauth/callback/threads?"
			params := []string{}
			if !tt.noState {
				if _, has := tt.queryParams["state"]; !has {
					params = append(params, "state="+accountIDStr)
				}
			}
			for k, v := range tt.queryParams {
				params = append(params, k+"="+v)
			}
			for i, p := range params {
				if i == 0 {
					urlStr += p
				} else {
					urlStr += "&" + p
				}
			}

			tt.setup(t)

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

// TestPlatformsAPI_OAuthCallback_Facebook tests GET /api/platforms/oauth/callback/facebook.
// Facebook/Instagram token URL was hardcoded. Decision 2 makes it configurable via
// FACEBOOK_OAUTH_TOKEN_URL; now token exchange is mockable via the Facebook mock.
func TestPlatformsAPI_OAuthCallback_Facebook(t *testing.T) {
	t.Parallel()
	env := testenv.GlobalEnv
	c := testClient(t)

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	tests := []struct {
		name            string
		queryParams     map[string]string
		noState         bool // when true, do NOT inject state automatically
		setup           func(t *testing.T)
		wantStatus      int
		wantLocationSub string
	}{
		{
			name:        "400 when code is missing",
			queryParams: map[string]string{"state": uuid.New().String()},
			setup:       func(t *testing.T) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "400 when state is missing",
			queryParams: map[string]string{"code": "some-code"},
			noState:     true,
			setup:       func(t *testing.T) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "400 when state is not a UUID",
			queryParams: map[string]string{"code": "some-code", "state": "not-a-uuid"},
			setup:       func(t *testing.T) {},
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "302 to error when token exchange fails",
			queryParams: map[string]string{"code": "bad-code"},
			setup: func(t *testing.T) {
				env.Facebook.ExpectOAuthToken(t).
					ReturnStatus(http.StatusBadRequest).
					Times(1, t)
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "error=facebook",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			accountIDStr := u.AccountID.String()

			urlStr := env.BaseURL + "/api/platforms/oauth/callback/facebook?"
			params := []string{}
			if !tt.noState {
				if _, has := tt.queryParams["state"]; !has {
					params = append(params, "state="+accountIDStr)
				}
			}
			for k, v := range tt.queryParams {
				params = append(params, k+"="+v)
			}
			for i, p := range params {
				if i == 0 {
					urlStr += p
				} else {
					urlStr += "&" + p
				}
			}

			tt.setup(t)

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

// TestPlatformsAPI_OAuthCallback_Instagram tests GET /api/platforms/oauth/callback/instagram.
func TestPlatformsAPI_OAuthCallback_Instagram(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		queryCode  string
		queryState string
		wantStatus int
	}{
		{
			name:       "400 when code is missing",
			queryCode:  "",
			queryState: uuid.New().String(),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when state is missing",
			queryCode:  "some-code",
			queryState: "",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when state is not a UUID",
			queryCode:  "some-code",
			queryState: "not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
	}

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			_ = u

			urlStr := testenv.GlobalEnv.BaseURL + "/api/platforms/oauth/callback/instagram?"
			sep := ""
			if tt.queryCode != "" {
				urlStr += sep + "code=" + tt.queryCode
				sep = "&"
			}
			if tt.queryState != "" {
				urlStr += sep + "state=" + tt.queryState
				sep = "&"
			}

			req, err := http.NewRequest(http.MethodGet, urlStr, nil)
			require.NoError(t, err)
			resp, err := noRedirectClient.Do(req)
			require.NoError(t, err)
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestPlatformsAPI_OAuthCallback_TikTok tests GET /api/platforms/oauth/callback/tiktok.
func TestPlatformsAPI_OAuthCallback_TikTok(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		queryCode  string
		queryState string
		wantStatus int
	}{
		{
			name:       "400 when code is missing",
			queryCode:  "",
			queryState: uuid.New().String(),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when state is missing",
			queryCode:  "some-code",
			queryState: "",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when state is not a UUID",
			queryCode:  "some-code",
			queryState: "not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
	}

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			_ = u

			urlStr := testenv.GlobalEnv.BaseURL + "/api/platforms/oauth/callback/tiktok?"
			sep := ""
			if tt.queryCode != "" {
				urlStr += sep + "code=" + tt.queryCode
				sep = "&"
			}
			if tt.queryState != "" {
				urlStr += sep + "state=" + tt.queryState
				sep = "&"
			}

			req, err := http.NewRequest(http.MethodGet, urlStr, nil)
			require.NoError(t, err)
			resp, err := noRedirectClient.Do(req)
			require.NoError(t, err)
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestPlatformsAPI_OAuthCallback_Pinterest tests GET /api/platforms/oauth/callback/pinterest.
func TestPlatformsAPI_OAuthCallback_Pinterest(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		queryCode  string
		queryState string
		wantStatus int
	}{
		{
			name:       "400 when code is missing",
			queryCode:  "",
			queryState: uuid.New().String(),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when state is missing",
			queryCode:  "some-code",
			queryState: "",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "400 when state is not a UUID",
			queryCode:  "some-code",
			queryState: "not-a-uuid",
			wantStatus: http.StatusBadRequest,
		},
	}

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			_ = u

			urlStr := testenv.GlobalEnv.BaseURL + "/api/platforms/oauth/callback/pinterest?"
			sep := ""
			if tt.queryCode != "" {
				urlStr += sep + "code=" + tt.queryCode
				sep = "&"
			}
			if tt.queryState != "" {
				urlStr += sep + "state=" + tt.queryState
				sep = "&"
			}

			req, err := http.NewRequest(http.MethodGet, urlStr, nil)
			require.NoError(t, err)
			resp, err := noRedirectClient.Do(req)
			require.NoError(t, err)
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestPlatformsAPI_OAuthCallback_X tests GET /api/platforms/oauth/callback/x.
// X uses PKCE: InitiateOAuth must be called first to store the verifier.
func TestPlatformsAPI_OAuthCallback_X(t *testing.T) {
	t.Parallel()
	env := testenv.GlobalEnv
	c := testClient(t)

	noRedirectClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	tests := []struct {
		name            string
		queryParams     map[string]string
		noState         bool // when true, do NOT inject state automatically
		setup           func(t *testing.T, accountID uuid.UUID) (accountIDForState uuid.UUID)
		wantStatus      int
		wantLocationSub string
	}{
		{
			name:        "400 when code is missing",
			queryParams: map[string]string{"state": uuid.New().String()},
			setup: func(t *testing.T, _ uuid.UUID) uuid.UUID {
				return uuid.New()
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:        "400 when state is missing",
			queryParams: map[string]string{"code": "some-code"},
			noState:     true,
			setup: func(t *testing.T, _ uuid.UUID) uuid.UUID {
				return uuid.New()
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:        "302 to error when PKCE verifier not found (account never called init)",
			queryParams: map[string]string{"code": "some-code"},
			setup: func(t *testing.T, _ uuid.UUID) uuid.UUID {
				// Use a random account UUID that never called InitiateOAuth
				return uuid.New()
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "error=x",
		},
		{
			name:        "302 to error when token exchange fails",
			queryParams: map[string]string{"code": "bad-code"},
			setup: func(t *testing.T, accountID uuid.UUID) uuid.UUID {
				// First call InitiateOAuth to store PKCE verifier.
				u := seedUserWithAccount(t, c.Store)
				resp, _ := c.Request(t, http.MethodPost, "/api/protected/platforms/oauth/init",
					map[string]any{"platform": "x"}, u.Token)
				assert.Equal(t, http.StatusOK, resp.StatusCode)
				env.X.ExpectOAuthToken(t).
					ReturnStatus(http.StatusBadRequest).
					Times(1, t)
				return u.AccountID
			},
			wantStatus:      http.StatusFound,
			wantLocationSub: "error=x",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			u := seedUserWithAccount(t, c.Store)
			accountID := tt.setup(t, u.AccountID)

			urlStr := env.BaseURL + "/api/platforms/oauth/callback/x?"
			params := []string{}
			if !tt.noState {
				if _, has := tt.queryParams["state"]; !has {
					params = append(params, "state="+accountID.String())
				}
			}
			for k, v := range tt.queryParams {
				params = append(params, k+"="+v)
			}
			for i, p := range params {
				if i == 0 {
					urlStr += p
				} else {
					urlStr += "&" + p
				}
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

// TestPlatformsAPI_ConnectBluesky tests POST /api/protected/platforms/bluesky.
func TestPlatformsAPI_ConnectBluesky(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		body       any
		wantStatus int
	}{
		{
			// ConnectBluesky stores the app-password as a credential directly —
			// no external Bluesky API call is made during connect.
			name: "201 connects successfully",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"handle": "testuser.bsky.social", "app_password": "test-app-password"},
			wantStatus: http.StatusCreated,
		},
		{
			name: "400 when handle is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"app_password": "test-app-password"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when app_password is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"handle": "testuser.bsky.social"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no JWT",
			setup: func(t *testing.T) string {
				return ""
			},
			body:       map[string]any{"handle": "testuser.bsky.social", "app_password": "test-app-password"},
			wantStatus: http.StatusUnauthorized,
		},
		{
			// The store uses ON CONFLICT ... DO UPDATE so re-connecting the same handle
			// is an upsert (201). A different handle for the same account creates a
			// second connection row (201). There is no 409 path in ConnectBluesky.
			name: "201 reconnects when same handle already connected (upsert)",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				// Seed a bluesky connection with the same handle that will be upserted.
				_, err := c.Store.GetDB().ExecContext(context.Background(),
					`INSERT INTO platform_connections (account_id, platform, platform_user_id, access_token, scopes)
					 VALUES ($1, 'bluesky', 'testuser.bsky.social', 'old-password', '{}')`,
					u.AccountID)
				require.NoError(t, err)
				return u.Token
			},
			body:       map[string]any{"handle": "testuser.bsky.social", "app_password": "new-password"},
			wantStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, _ := c.Request(t, http.MethodPost, "/api/protected/platforms/bluesky", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}

// TestPlatformsAPI_ConnectWithToken tests POST /api/protected/platforms/token.
// The 201 path requires SOCIAL_THREADS_ACCESS_TOKEN to be set in env.test.
func TestPlatformsAPI_ConnectWithToken(t *testing.T) {
	t.Parallel()
	env := testenv.GlobalEnv
	c := testClient(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		body       any
		wantStatus int
	}{
		{
			// ConnectWithToken calls threadsClient.GetProfile (GET /v1.0/me) to fetch
			// the platform user ID before storing the connection.
			name: "201 connects threads with static token",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				env.Threads.ExpectVerifyCredentials(t).
					ReturnJSON(http.StatusOK, map[string]any{
						"id":       "threads-user-id",
						"username": "testthreadsuser",
					}).Times(1, t)
				return u.Token
			},
			body:       map[string]any{"platform": "threads"},
			wantStatus: http.StatusCreated,
		},
		{
			name: "400 when platform field is missing",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when platform is unsupported (not in any config map)",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			body:       map[string]any{"platform": "unsupported_xyz"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when platform has no static token configured",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			// "x" is in oauthConfigs but has no static token — expects ErrMissingToken
			body:       map[string]any{"platform": "x"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no JWT",
			setup: func(t *testing.T) string {
				return ""
			},
			body:       map[string]any{"platform": "threads"},
			wantStatus: http.StatusUnauthorized,
		},
		{
			// The store uses ON CONFLICT ... DO UPDATE so re-connecting the same platform
			// user is an upsert (201). There is no 409 path in ConnectWithToken.
			name: "201 reconnects when threads already connected (upsert)",
			setup: func(t *testing.T) string {
				u := seedUserWithAccount(t, c.Store)
				// Seed an existing connection that will be upserted on reconnect.
				_, err := c.Store.GetDB().ExecContext(context.Background(),
					`INSERT INTO platform_connections (account_id, platform, platform_user_id, access_token, scopes)
					 VALUES ($1, 'threads', 'threads-user-id', 'old-token', '{}')`,
					u.AccountID)
				require.NoError(t, err)
				env.Threads.ExpectVerifyCredentials(t).
					ReturnJSON(http.StatusOK, map[string]any{
						"id":       "threads-user-id",
						"username": "testthreadsuser",
					}).Times(1, t)
				return u.Token
			},
			body:       map[string]any{"platform": "threads"},
			wantStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token := tt.setup(t)
			resp, _ := c.Request(t, http.MethodPost, "/api/protected/platforms/token", tt.body, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
		})
	}
}
