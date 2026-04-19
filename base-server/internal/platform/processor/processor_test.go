package processor

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testOAuthConfigs() PlatformOAuthConfigs {
	return PlatformOAuthConfigs{
		"x": {
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "https://example.com/callback",
			Scopes:       []string{"read", "write"},
			AuthURL:      "https://x.com/oauth/authorize",
			TokenURL:     "https://x.com/oauth/token",
		},
		"linkedin": {
			ClientID:     "linkedin-client-id",
			ClientSecret: "linkedin-client-secret",
			RedirectURL:  "https://example.com/callback/linkedin",
			Scopes:       []string{"r_liteprofile", "w_member_social"},
			AuthURL:      "https://www.linkedin.com/oauth/v2/authorization",
			TokenURL:     "https://www.linkedin.com/oauth/v2/accessToken",
		},
	}
}

func TestPlatformProcessor_InitiateOAuth(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path returns auth URL", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		url, err := proc.InitiateOAuth(context.Background(), accountID, "x")

		require.NoError(t, err)
		assert.Contains(t, url, "https://x.com/oauth/authorize")
		assert.Contains(t, url, "test-client-id")
		assert.Contains(t, url, accountID.String())
	})

	t.Run("unsupported platform", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		_, err := proc.InitiateOAuth(context.Background(), accountID, "unknown")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnsupportedPlatform)
	})
}

func TestPlatformProcessor_HandleOAuthCallback(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path creates connection", func(t *testing.T) {
		t.Parallel()
		connID := uuid.New()

		// Mock X token endpoint
		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"access_token":  "test-access-token",
				"refresh_token": "test-refresh-token",
			})
		}))
		defer tokenServer.Close()

		// Mock X profile endpoint — not called via config, uses hardcoded URL,
		// so profile fetch will fail gracefully and use fallback "unknown"
		mockStore := &MockPlatformStore{
			CreatePlatformConnectionFn: func(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error) {
				return store.PlatformConnection{ID: connID, AccountID: params.AccountID, Platform: params.Platform}, nil
			},
		}
		configs := testOAuthConfigs()
		xCfg := configs["x"]
		xCfg.TokenURL = tokenServer.URL
		configs["x"] = xCfg

		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		// Pre-seed the PKCE verifier
		proc.pkceVerifiers[accountID.String()] = "test-verifier"

		conn, err := proc.HandleOAuthCallback(context.Background(), accountID, "x", "auth-code")

		require.NoError(t, err)
		assert.Equal(t, connID, conn.ID)
		assert.Equal(t, "x", conn.Platform)
	})

	t.Run("unsupported platform", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		_, err := proc.HandleOAuthCallback(context.Background(), accountID, "unknown", "code")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnsupportedPlatform)
	})

	t.Run("store error returns ErrHandleOAuthCallback", func(t *testing.T) {
		t.Parallel()

		// Mock X token endpoint
		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"access_token":  "test-access-token",
				"refresh_token": "test-refresh-token",
			})
		}))
		defer tokenServer.Close()

		mockStore := &MockPlatformStore{
			CreatePlatformConnectionFn: func(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error) {
				return store.PlatformConnection{}, errors.New("db error")
			},
		}
		configs := testOAuthConfigs()
		xCfg := configs["x"]
		xCfg.TokenURL = tokenServer.URL
		configs["x"] = xCfg

		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		// Pre-seed the PKCE verifier
		proc.pkceVerifiers[accountID.String()] = "test-verifier"

		_, err := proc.HandleOAuthCallback(context.Background(), accountID, "x", "code")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrHandleOAuthCallback)
	})
}

func TestPlatformProcessor_ConnectBluesky(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path (new connection)", func(t *testing.T) {
		t.Parallel()
		connID := uuid.New()
		mockStore := &MockPlatformStore{
			CreatePlatformConnectionFn: func(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error) {
				return store.PlatformConnection{ID: connID, Platform: "bluesky", PlatformUserID: params.PlatformUserID}, nil
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		conn, err := proc.ConnectBluesky(context.Background(), accountID, "user.bsky.social", "app-password")

		require.NoError(t, err)
		assert.Equal(t, connID, conn.ID)
		assert.Equal(t, "bluesky", conn.Platform)
	})

	t.Run("reconnect upserts existing row", func(t *testing.T) {
		t.Parallel()
		existingID := uuid.New()
		var capturedToken string
		mockStore := &MockPlatformStore{
			CreatePlatformConnectionFn: func(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error) {
				capturedToken = params.AccessToken
				return store.PlatformConnection{ID: existingID, Platform: "bluesky", PlatformUserID: params.PlatformUserID, AccessToken: params.AccessToken}, nil
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		conn, err := proc.ConnectBluesky(context.Background(), accountID, "user.bsky.social", "new-app-password")

		require.NoError(t, err)
		assert.Equal(t, existingID, conn.ID)
		assert.Equal(t, "new-app-password", capturedToken)
	})

	t.Run("create connection error", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{
			CreatePlatformConnectionFn: func(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error) {
				return store.PlatformConnection{}, errors.New("db error")
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		_, err := proc.ConnectBluesky(context.Background(), accountID, "user.bsky.social", "app-password")

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrConnectBluesky)
	})
}

func TestPlatformProcessor_DisconnectPlatform(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	connID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{
			DeletePlatformConnectionFn: func(ctx context.Context, aID, id uuid.UUID) error {
				return nil
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		err := proc.DisconnectPlatform(context.Background(), accountID, connID)

		require.NoError(t, err)
	})

	t.Run("not found returns ErrConnectionNotFound", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{
			DeletePlatformConnectionFn: func(ctx context.Context, aID, id uuid.UUID) error {
				return store.ErrNotFound
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		err := proc.DisconnectPlatform(context.Background(), accountID, connID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrConnectionNotFound)
	})

	t.Run("other error returns ErrDisconnectPlatform", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{
			DeletePlatformConnectionFn: func(ctx context.Context, aID, id uuid.UUID) error {
				return errors.New("db error")
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		err := proc.DisconnectPlatform(context.Background(), accountID, connID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrDisconnectPlatform)
	})
}

func TestPlatformProcessor_ListConnections(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{
			ListPlatformConnectionsByAccountFn: func(ctx context.Context, aID uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{ID: uuid.New(), Platform: "x"},
					{ID: uuid.New(), Platform: "linkedin"},
				}, nil
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		result, err := proc.ListConnections(context.Background(), accountID)

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("store error returns ErrListConnections", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockPlatformStore{
			ListPlatformConnectionsByAccountFn: func(ctx context.Context, aID uuid.UUID) ([]store.PlatformConnection, error) {
				return nil, errors.New("db error")
			},
		}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		_, err := proc.ListConnections(context.Background(), accountID)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrListConnections)
	})
}

func TestPlatformProcessor_RefreshConnection(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	connID := uuid.New()
	refreshToken := "test-refresh-token"

	t.Run("success - new tokens persisted", func(t *testing.T) {
		t.Parallel()

		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token":  "new-access-token",
				"refresh_token": "new-refresh-token",
				"expires_in":    7200,
			})
		}))
		defer tokenServer.Close()

		var storedAccessToken string
		mockStore := &MockPlatformStore{
			UpdatePlatformConnectionTokensFn: func(ctx context.Context, aID, id uuid.UUID, accessToken string, rt *string, expiresAt *time.Time) error {
				storedAccessToken = accessToken
				return nil
			},
		}

		configs := PlatformOAuthConfigs{
			"linkedin": {
				ClientID:     "client-id",
				ClientSecret: "client-secret",
				TokenURL:     tokenServer.URL,
			},
		}

		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		conn := store.PlatformConnection{
			ID:           connID,
			AccountID:    accountID,
			Platform:     "linkedin",
			AccessToken:  "old-token",
			RefreshToken: &refreshToken,
		}

		result, err := proc.RefreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.Equal(t, "new-access-token", result.AccessToken)
		assert.Equal(t, "new-access-token", storedAccessToken)
		assert.NotNil(t, result.TokenExpiresAt)
		assert.Equal(t, "active", result.Status)
	})

	t.Run("revoked token - connection marked expired", func(t *testing.T) {
		t.Parallel()

		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid_grant"}`))
		}))
		defer tokenServer.Close()

		var updatedStatus string
		mockStore := &MockPlatformStore{
			UpdatePlatformConnectionStatusFn: func(ctx context.Context, aID, id uuid.UUID, status string) error {
				updatedStatus = status
				return nil
			},
		}

		configs := PlatformOAuthConfigs{
			"linkedin": {
				ClientID:     "client-id",
				ClientSecret: "client-secret",
				TokenURL:     tokenServer.URL,
			},
		}

		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		conn := store.PlatformConnection{
			ID:           connID,
			AccountID:    accountID,
			Platform:     "linkedin",
			AccessToken:  "old-token",
			RefreshToken: &refreshToken,
		}

		result, err := proc.RefreshConnection(context.Background(), conn)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrTokenRevoked)
		assert.Equal(t, "expired", result.Status)
		assert.Equal(t, "expired", updatedStatus)
	})

	t.Run("no refresh token", func(t *testing.T) {
		t.Parallel()

		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		conn := store.PlatformConnection{
			ID:        connID,
			AccountID: accountID,
			Platform:  "linkedin",
		}

		_, err := proc.RefreshConnection(context.Background(), conn)

		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNoRefreshToken)
	})

	t.Run("bluesky - skipped, returned unchanged", func(t *testing.T) {
		t.Parallel()

		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		conn := store.PlatformConnection{
			ID:        connID,
			AccountID: accountID,
			Platform:  "bluesky",
		}

		result, err := proc.RefreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.Equal(t, connID, result.ID)
	})

	t.Run("X token refresh uses basic auth", func(t *testing.T) {
		t.Parallel()

		var gotBasicAuth bool
		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _, ok := r.BasicAuth()
			gotBasicAuth = ok
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token":  "new-x-token",
				"refresh_token": "new-x-refresh",
				"expires_in":    7200,
			})
		}))
		defer tokenServer.Close()

		mockStore := &MockPlatformStore{
			UpdatePlatformConnectionTokensFn: func(ctx context.Context, aID, id uuid.UUID, accessToken string, rt *string, expiresAt *time.Time) error {
				return nil
			},
		}

		configs := PlatformOAuthConfigs{
			"x": {
				ClientID:     "x-client-id",
				ClientSecret: "x-client-secret",
				TokenURL:     tokenServer.URL,
			},
		}

		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)
		conn := store.PlatformConnection{
			ID:           connID,
			AccountID:    accountID,
			Platform:     "x",
			AccessToken:  "old-token",
			RefreshToken: &refreshToken,
		}

		result, err := proc.RefreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.True(t, gotBasicAuth, "X refresh should use Basic auth")
		assert.Equal(t, "new-x-token", result.AccessToken)
	})
}

func TestPlatformProcessor_EnsureFreshConnection(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	connID := uuid.New()

	t.Run("fresh token - no refresh", func(t *testing.T) {
		t.Parallel()

		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		futureExpiry := time.Now().Add(2 * time.Hour)
		conn := store.PlatformConnection{
			ID:             connID,
			AccountID:      accountID,
			Platform:       "linkedin",
			TokenExpiresAt: &futureExpiry,
		}

		result, err := proc.EnsureFreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.Equal(t, connID, result.ID)
	})

	t.Run("near-expiry triggers refresh", func(t *testing.T) {
		t.Parallel()

		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token":  "refreshed-token",
				"refresh_token": "new-refresh",
				"expires_in":    7200,
			})
		}))
		defer tokenServer.Close()

		mockStore := &MockPlatformStore{
			UpdatePlatformConnectionTokensFn: func(ctx context.Context, aID, id uuid.UUID, accessToken string, rt *string, expiresAt *time.Time) error {
				return nil
			},
		}

		configs := PlatformOAuthConfigs{
			"linkedin": {
				ClientID:     "client-id",
				ClientSecret: "client-secret",
				TokenURL:     tokenServer.URL,
			},
		}
		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		refreshToken := "old-refresh"
		nearExpiry := time.Now().Add(2 * time.Minute) // within 5-min window
		conn := store.PlatformConnection{
			ID:             connID,
			AccountID:      accountID,
			Platform:       "linkedin",
			AccessToken:    "old-token",
			RefreshToken:   &refreshToken,
			TokenExpiresAt: &nearExpiry,
		}

		result, err := proc.EnsureFreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.Equal(t, "refreshed-token", result.AccessToken)
	})

	t.Run("no expiry set - no refresh", func(t *testing.T) {
		t.Parallel()

		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		conn := store.PlatformConnection{
			ID:        connID,
			AccountID: accountID,
			Platform:  "linkedin",
		}

		result, err := proc.EnsureFreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.Equal(t, connID, result.ID)
	})

	t.Run("bluesky - always fresh", func(t *testing.T) {
		t.Parallel()

		mockStore := &MockPlatformStore{}
		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		nearExpiry := time.Now().Add(1 * time.Minute)
		conn := store.PlatformConnection{
			ID:             connID,
			AccountID:      accountID,
			Platform:       "bluesky",
			TokenExpiresAt: &nearExpiry,
		}

		result, err := proc.EnsureFreshConnection(context.Background(), conn)

		require.NoError(t, err)
		assert.Equal(t, connID, result.ID)
	})
}

func TestPlatformProcessor_HealthCheckWithRefresh(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	connID := uuid.New()

	t.Run("near-expiry token is proactively refreshed", func(t *testing.T) {
		t.Parallel()

		tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token":  "refreshed-token",
				"refresh_token": "new-refresh",
				"expires_in":    7200,
			})
		}))
		defer tokenServer.Close()

		refreshToken := "test-refresh"
		nearExpiry := time.Now().Add(2 * time.Minute)

		mockStore := &MockPlatformStore{
			ListPlatformConnectionsByAccountFn: func(ctx context.Context, aID uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{
						ID:             connID,
						AccountID:      accountID,
						Platform:       "x",
						AccessToken:    "old-token",
						RefreshToken:   &refreshToken,
						TokenExpiresAt: &nearExpiry,
						Status:         "active",
					},
				}, nil
			},
			UpdatePlatformConnectionTokensFn: func(ctx context.Context, aID, id uuid.UUID, accessToken string, rt *string, expiresAt *time.Time) error {
				return nil
			},
		}

		configs := PlatformOAuthConfigs{
			"x": {
				ClientID:     "x-client-id",
				ClientSecret: "x-client-secret",
				TokenURL:     tokenServer.URL,
			},
		}

		proc := New(mockStore, configs, StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		result, err := proc.ListConnections(context.Background(), accountID)

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "active", result[0].Status)
		assert.Equal(t, "refreshed-token", result[0].AccessToken)
	})

	t.Run("fresh token is not refreshed", func(t *testing.T) {
		t.Parallel()

		futureExpiry := time.Now().Add(2 * time.Hour)

		mockStore := &MockPlatformStore{
			ListPlatformConnectionsByAccountFn: func(ctx context.Context, aID uuid.UUID) ([]store.PlatformConnection, error) {
				return []store.PlatformConnection{
					{
						ID:             connID,
						AccountID:      accountID,
						Platform:       "x",
						AccessToken:    "valid-token",
						TokenExpiresAt: &futureExpiry,
						Status:         "active",
					},
				}, nil
			},
		}

		proc := New(mockStore, testOAuthConfigs(), StaticTokens{}, &http.Client{}, logger, nil, nil, nil)

		result, err := proc.ListConnections(context.Background(), accountID)

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "active", result[0].Status)
	})
}
