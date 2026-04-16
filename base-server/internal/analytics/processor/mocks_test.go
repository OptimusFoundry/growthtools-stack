package processor

import (
	"context"
	"time"

	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// MockAnalyticsStore is a manual mock for AnalyticsStore
type MockAnalyticsStore struct {
	GetAnalyticsOverviewFn   func(ctx context.Context, accountID uuid.UUID, from, to time.Time) (store.AnalyticsOverview, error)
	GetAnalyticsTimeSeriesFn func(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.AnalyticsTimeSeries, error)
	GetAnalyticsByPlatformFn func(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.PlatformAnalytics, error)
}

func (m *MockAnalyticsStore) GetAnalyticsOverview(ctx context.Context, accountID uuid.UUID, from, to time.Time) (store.AnalyticsOverview, error) {
	return m.GetAnalyticsOverviewFn(ctx, accountID, from, to)
}

func (m *MockAnalyticsStore) GetAnalyticsTimeSeries(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.AnalyticsTimeSeries, error) {
	return m.GetAnalyticsTimeSeriesFn(ctx, accountID, from, to)
}

func (m *MockAnalyticsStore) GetAnalyticsByPlatform(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.PlatformAnalytics, error) {
	return m.GetAnalyticsByPlatformFn(ctx, accountID, from, to)
}
