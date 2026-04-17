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
	c := testClient(t)

	validFrom := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	validTo := time.Now().UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string // returns token
		query      string
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns zeros when no analytics data exists",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got store.AnalyticsOverview
				require.NoError(t, json.Unmarshal(body, &got))
				// all counts should be 0 for a fresh account
				assert.Equal(t, 0, got.TotalImpressions)
			},
		},
		{
			name: "200 with explicit date range",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=" + validFrom + "&to=" + validTo,
			wantStatus: http.StatusOK,
		},
		{
			name: "400 when from date is malformed",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=not-a-date",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when to date is malformed",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "to=not-a-date",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when from is after to",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=" + validTo + "&to=" + validFrom,
			wantStatus: http.StatusBadRequest,
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
			path := "/api/protected/analytics/overview"
			if tt.query != "" {
				path += "?" + tt.query
			}
			resp, body := c.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestAnalyticsAPI_GetTimeSeries(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	validFrom := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	validTo := time.Now().UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string
		query      string
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty array for fresh account",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.AnalyticsTimeSeries
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got) // never null — COALESCE ensures an array
			},
		},
		{
			name: "200 with explicit date range",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=" + validFrom + "&to=" + validTo,
			wantStatus: http.StatusOK,
		},
		{
			name: "400 when from date is malformed",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=bad-date",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when from is after to",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=" + validTo + "&to=" + validFrom,
			wantStatus: http.StatusBadRequest,
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
			path := "/api/protected/analytics/timeseries"
			if tt.query != "" {
				path += "?" + tt.query
			}
			resp, body := c.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}

func TestAnalyticsAPI_GetPlatformBreakdown(t *testing.T) {
	t.Parallel()
	c := testClient(t)

	validFrom := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	validTo := time.Now().UTC().Format(time.RFC3339)

	tests := []struct {
		name       string
		setup      func(t *testing.T) string
		query      string
		wantStatus int
		wantBody   func(t *testing.T, body []byte)
	}{
		{
			name: "200 returns empty array for fresh account",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			wantStatus: http.StatusOK,
			wantBody: func(t *testing.T, body []byte) {
				var got []store.PlatformAnalytics
				require.NoError(t, json.Unmarshal(body, &got))
				assert.NotNil(t, got)
			},
		},
		{
			name: "200 with explicit date range",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=" + validFrom + "&to=" + validTo,
			wantStatus: http.StatusOK,
		},
		{
			name: "400 when from date is malformed",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=bad-date",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "400 when from is after to",
			setup: func(t *testing.T) string {
				return seedUserWithAccount(t, c.Store).Token
			},
			query:      "from=" + validTo + "&to=" + validFrom,
			wantStatus: http.StatusBadRequest,
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
			path := "/api/protected/analytics/platforms"
			if tt.query != "" {
				path += "?" + tt.query
			}
			resp, body := c.Request(t, http.MethodGet, path, nil, token)
			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			if tt.wantBody != nil {
				tt.wantBody(t, body)
			}
		})
	}
}
