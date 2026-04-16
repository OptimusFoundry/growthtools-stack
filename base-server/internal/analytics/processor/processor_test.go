package processor

import (
	"context"
	"errors"
	"testing"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnalyticsProcessor_GetOverview(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	from := time.Now().Add(-7 * 24 * time.Hour)
	to := time.Now()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockAnalyticsStore{
			GetAnalyticsOverviewFn: func(ctx context.Context, aID uuid.UUID, f, t time.Time) (store.AnalyticsOverview, error) {
				return store.AnalyticsOverview{
					TotalImpressions: 1000,
					TotalLikes:       50,
					TotalComments:    10,
					TotalShares:      5,
					TotalClicks:      100,
				}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.GetOverview(context.Background(), accountID, from, to)

		require.NoError(t, err)
		assert.Equal(t, 1000, result.TotalImpressions)
		assert.Equal(t, 50, result.TotalLikes)
		assert.Equal(t, 100, result.TotalClicks)
	})

	t.Run("store error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockAnalyticsStore{
			GetAnalyticsOverviewFn: func(ctx context.Context, aID uuid.UUID, f, t time.Time) (store.AnalyticsOverview, error) {
				return store.AnalyticsOverview{}, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetOverview(context.Background(), accountID, from, to)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestAnalyticsProcessor_GetTimeSeries(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	from := time.Now().Add(-7 * 24 * time.Hour)
	to := time.Now()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockAnalyticsStore{
			GetAnalyticsTimeSeriesFn: func(ctx context.Context, aID uuid.UUID, f, t time.Time) ([]store.AnalyticsTimeSeries, error) {
				return []store.AnalyticsTimeSeries{
					{Date: from, Impressions: 100, Likes: 10},
					{Date: from.Add(24 * time.Hour), Impressions: 200, Likes: 20},
				}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.GetTimeSeries(context.Background(), accountID, from, to)

		require.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, 100, result[0].Impressions)
		assert.Equal(t, 200, result[1].Impressions)
	})

	t.Run("store error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockAnalyticsStore{
			GetAnalyticsTimeSeriesFn: func(ctx context.Context, aID uuid.UUID, f, t time.Time) ([]store.AnalyticsTimeSeries, error) {
				return nil, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetTimeSeries(context.Background(), accountID, from, to)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}

func TestAnalyticsProcessor_GetPlatformBreakdown(t *testing.T) {
	t.Parallel()
	logger := observability.NewLogger()
	accountID := uuid.New()
	from := time.Now().Add(-7 * 24 * time.Hour)
	to := time.Now()

	t.Run("happy path", func(t *testing.T) {
		t.Parallel()
		mockStore := &MockAnalyticsStore{
			GetAnalyticsByPlatformFn: func(ctx context.Context, aID uuid.UUID, f, t time.Time) ([]store.PlatformAnalytics, error) {
				return []store.PlatformAnalytics{
					{Platform: "x", Impressions: 500, Likes: 25},
					{Platform: "linkedin", Impressions: 300, Likes: 15},
				}, nil
			},
		}
		proc := New(mockStore, logger)

		result, err := proc.GetPlatformBreakdown(context.Background(), accountID, from, to)

		require.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, "x", result[0].Platform)
		assert.Equal(t, 500, result[0].Impressions)
	})

	t.Run("store error propagated", func(t *testing.T) {
		t.Parallel()
		dbErr := errors.New("db error")
		mockStore := &MockAnalyticsStore{
			GetAnalyticsByPlatformFn: func(ctx context.Context, aID uuid.UUID, f, t time.Time) ([]store.PlatformAnalytics, error) {
				return nil, dbErr
			},
		}
		proc := New(mockStore, logger)

		_, err := proc.GetPlatformBreakdown(context.Background(), accountID, from, to)

		require.Error(t, err)
		assert.ErrorIs(t, err, dbErr)
	})
}
