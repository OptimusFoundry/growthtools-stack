package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"context"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

// AnalyticsStore defines the database operations required by AnalyticsProcessor
type AnalyticsStore interface {
	GetAnalyticsOverview(ctx context.Context, accountID uuid.UUID, from, to time.Time) (store.AnalyticsOverview, error)
	GetAnalyticsTimeSeries(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.AnalyticsTimeSeries, error)
	GetAnalyticsByPlatform(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.PlatformAnalytics, error)
}

type AnalyticsProcessor struct {
	store  AnalyticsStore
	logger *observability.Logger
}

func New(store AnalyticsStore, logger *observability.Logger) AnalyticsProcessor {
	return AnalyticsProcessor{
		store:  store,
		logger: logger,
	}
}

// GetOverview returns aggregated analytics for a date range
func (p *AnalyticsProcessor) GetOverview(ctx context.Context, accountID uuid.UUID, from, to time.Time) (store.AnalyticsOverview, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "from", Value: from.Format(time.RFC3339)},
		observability.Field{Key: "to", Value: to.Format(time.RFC3339)},
		observability.Field{Key: "operation", Value: "get_analytics_overview"},
	)

	overview, err := p.store.GetAnalyticsOverview(ctx, accountID, from, to)
	if err != nil {
		p.logger.Error(ctx, "failed to get analytics overview", err)
		return store.AnalyticsOverview{}, err
	}
	return overview, nil
}

// GetTimeSeries returns time-series analytics data for a date range
func (p *AnalyticsProcessor) GetTimeSeries(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.AnalyticsTimeSeries, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "from", Value: from.Format(time.RFC3339)},
		observability.Field{Key: "to", Value: to.Format(time.RFC3339)},
		observability.Field{Key: "operation", Value: "get_analytics_timeseries"},
	)

	series, err := p.store.GetAnalyticsTimeSeries(ctx, accountID, from, to)
	if err != nil {
		p.logger.Error(ctx, "failed to get analytics time series", err)
		return nil, err
	}
	return series, nil
}

// GetPlatformBreakdown returns per-platform analytics for a date range
func (p *AnalyticsProcessor) GetPlatformBreakdown(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]store.PlatformAnalytics, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "account_id", Value: accountID.String()},
		observability.Field{Key: "from", Value: from.Format(time.RFC3339)},
		observability.Field{Key: "to", Value: to.Format(time.RFC3339)},
		observability.Field{Key: "operation", Value: "get_analytics_by_platform"},
	)

	breakdown, err := p.store.GetAnalyticsByPlatform(ctx, accountID, from, to)
	if err != nil {
		p.logger.Error(ctx, "failed to get analytics by platform", err)
		return nil, err
	}
	return breakdown, nil
}
