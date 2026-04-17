//go:build integration

package tests

import (
	"context"
	"net/http"
	"testing"
	"time"

	analyticsHandler "base-server/internal/analytics/handler"
	analyticsProcessor "base-server/internal/analytics/processor"
	"base-server/internal/infra/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockAnalyticsStore implements analyticsProcessor.AnalyticsStore for testing.
type mockAnalyticsStore struct {
	overview    store.AnalyticsOverview
	timeSeries  []store.AnalyticsTimeSeries
	platformBD  []store.PlatformAnalytics
}

func newMockAnalyticsStore() *mockAnalyticsStore {
	return &mockAnalyticsStore{
		overview: store.AnalyticsOverview{
			TotalImpressions: 1000,
			TotalLikes:       250,
			TotalComments:    50,
			TotalShares:      30,
			TotalClicks:      120,
		},
		timeSeries: []store.AnalyticsTimeSeries{
			{
				Date:        time.Now().AddDate(0, 0, -1).UTC(),
				Impressions: 500,
				Likes:       100,
				Comments:    20,
				Shares:      15,
				Clicks:      60,
			},
			{
				Date:        time.Now().UTC(),
				Impressions: 500,
				Likes:       150,
				Comments:    30,
				Shares:      15,
				Clicks:      60,
			},
		},
		platformBD: []store.PlatformAnalytics{
			{Platform: "twitter", Impressions: 600, Likes: 150, Comments: 30, Shares: 20, Clicks: 70},
			{Platform: "linkedin", Impressions: 400, Likes: 100, Comments: 20, Shares: 10, Clicks: 50},
		},
	}
}

func (m *mockAnalyticsStore) GetAnalyticsOverview(_ context.Context, _ uuid.UUID, _, _ time.Time) (store.AnalyticsOverview, error) {
	return m.overview, nil
}

func (m *mockAnalyticsStore) GetAnalyticsTimeSeries(_ context.Context, _ uuid.UUID, _, _ time.Time) ([]store.AnalyticsTimeSeries, error) {
	return m.timeSeries, nil
}

func (m *mockAnalyticsStore) GetAnalyticsByPlatform(_ context.Context, _ uuid.UUID, _, _ time.Time) ([]store.PlatformAnalytics, error) {
	return m.platformBD, nil
}

// setupAnalyticsRouter sets up a Gin router with the analytics handler and mock store.
func setupAnalyticsRouter(accountID uuid.UUID) *gin.Engine {
	mockStore := newMockAnalyticsStore()
	logger := testLogger()

	proc := analyticsProcessor.New(mockStore, logger)
	handler := analyticsHandler.New(proc, logger)

	router := setupTestRouter()
	protected := router.Group("/api/protected", mockAuthMiddleware(accountID))
	{
		protected.GET("/analytics/overview", handler.HandleGetOverview)
		protected.GET("/analytics/timeseries", handler.HandleGetTimeSeries)
		protected.GET("/analytics/platforms", handler.HandleGetPlatformBreakdown)
	}

	return router
}

func TestAnalyticsAPI_GetOverview(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/overview", nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.AnalyticsOverview
	parseResponseBody(t, w, &resp)
	assert.Equal(t, 1000, resp.TotalImpressions)
	assert.Equal(t, 250, resp.TotalLikes)
	assert.Equal(t, 50, resp.TotalComments)
	assert.Equal(t, 30, resp.TotalShares)
	assert.Equal(t, 120, resp.TotalClicks)
}

func TestAnalyticsAPI_GetOverview_WithDateRange(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	from := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	to := time.Now().UTC().Format(time.RFC3339)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/overview?from="+from+"&to="+to, nil)
	assertStatus(t, w, http.StatusOK)

	var resp store.AnalyticsOverview
	parseResponseBody(t, w, &resp)
	assert.Equal(t, 1000, resp.TotalImpressions)
}

func TestAnalyticsAPI_GetOverview_InvalidFromDate(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/overview?from=invalid-date", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestAnalyticsAPI_GetOverview_InvalidToDate(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	from := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)
	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/overview?from="+from+"&to=bad-date", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestAnalyticsAPI_GetOverview_FromAfterTo(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	from := time.Now().UTC().Format(time.RFC3339)
	to := time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/overview?from="+from+"&to="+to, nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestAnalyticsAPI_GetTimeSeries(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/timeseries", nil)
	assertStatus(t, w, http.StatusOK)

	var timeseries []store.AnalyticsTimeSeries
	parseResponseBody(t, w, &timeseries)
	assert.Len(t, timeseries, 2)
}

func TestAnalyticsAPI_GetTimeSeries_InvalidDateRange(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/timeseries?from=not-a-date", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestAnalyticsAPI_GetPlatformBreakdown(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/platforms", nil)
	assertStatus(t, w, http.StatusOK)

	var platforms []store.PlatformAnalytics
	parseResponseBody(t, w, &platforms)
	assert.Len(t, platforms, 2)
	assert.Equal(t, "twitter", platforms[0].Platform)
	assert.Equal(t, "linkedin", platforms[1].Platform)
}

func TestAnalyticsAPI_GetPlatformBreakdown_InvalidDateRange(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/platforms?from=bad-date", nil)
	assertStatus(t, w, http.StatusBadRequest)
}

func TestAnalyticsAPI_DefaultDateRange(t *testing.T) {
	t.Parallel()

	accountID := uuid.New()
	router := setupAnalyticsRouter(accountID)

	// No from/to params - should default to last 30 days
	w := makeRequest(t, router, http.MethodGet, "/api/protected/analytics/overview", nil)
	assertStatus(t, w, http.StatusOK)

	w = makeRequest(t, router, http.MethodGet, "/api/protected/analytics/timeseries", nil)
	assertStatus(t, w, http.StatusOK)

	w = makeRequest(t, router, http.MethodGet, "/api/protected/analytics/platforms", nil)
	assertStatus(t, w, http.StatusOK)
}
