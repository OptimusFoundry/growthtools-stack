//go:build integration

package tests

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"base-server/internal/infra/store"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnalyticsAPI_GetOverview(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	from := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	to := time.Now().UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, queryPath string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns overview with no date params",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/analytics/overview"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.AnalyticsOverview
				require.NoError(t, json.Unmarshal(body, &got))
				// Zero values are valid for a fresh account
				assert.GreaterOrEqual(t, got.TotalImpressions, 0)
			},
		},
		{
			name: "200 returns overview with date range",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/analytics/overview?from=" + from + "&to=" + to
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "400 when from is invalid",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/analytics/overview?from=not-a-date"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when to is invalid",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/analytics/overview?from=" + from + "&to=bad-date"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when from is after to",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				earlyTo := time.Now().AddDate(0, 0, -14).UTC().Format(time.RFC3339)
				return newJWT(t, userID, accountID),
					"/api/protected/analytics/overview?from=" + from + "&to=" + earlyTo
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/analytics/overview"
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestAnalyticsAPI_GetTimeSeries(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	from := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns timeseries (may be empty for new account)",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/analytics/timeseries"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				// Body is a JSON array — may be [] for fresh account
				var ts []store.AnalyticsTimeSeries
				require.NoError(t, json.Unmarshal(body, &ts))
			},
		},
		{
			name: "400 when from date is invalid",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/analytics/timeseries?from=not-a-date"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/analytics/timeseries?from=" + from
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestAnalyticsAPI_GetPlatformBreakdown(t *testing.T) {
	t.Parallel()
	srv := setupTestServer(t)

	tests := []struct {
		name       string
		setup      func(t *testing.T) (token string, path string)
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns platform breakdown",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID), "/api/protected/analytics/platforms"
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var platforms []store.PlatformAnalytics
				require.NoError(t, json.Unmarshal(body, &platforms))
				// For a fresh account there are no analytics rows
			},
		},
		{
			name: "400 when from is invalid",
			setup: func(t *testing.T) (string, string) {
				userID, accountID := seedUserAndAccount(t, srv.Store)
				return newJWT(t, userID, accountID),
					"/api/protected/analytics/platforms?from=bad-date"
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "401 when no token",
			setup: func(t *testing.T) (string, string) {
				return "", "/api/protected/analytics/platforms"
			},
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			token, path := tt.setup(t)
			resp, body := srv.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}
