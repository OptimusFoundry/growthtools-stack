package store

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// RecordPostAnalyticsParams represents parameters for recording analytics
type RecordPostAnalyticsParams struct {
	PlatformPostID uuid.UUID
	Platform       string
	Impressions    int
	Likes          int
	Comments       int
	Shares         int
	Clicks         int
}

const sqlRecordPostAnalytics = `
INSERT INTO post_analytics (platform_post_id, platform, impressions, likes, comments, shares, clicks)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, platform_post_id, platform, impressions, likes, comments, shares, clicks, collected_at, created_at
`

func (s *Store) RecordPostAnalytics(ctx context.Context, params RecordPostAnalyticsParams) (PostAnalytics, error) {
	var pa PostAnalytics
	err := s.db.GetContext(ctx, &pa, sqlRecordPostAnalytics,
		params.PlatformPostID, params.Platform,
		params.Impressions, params.Likes, params.Comments, params.Shares, params.Clicks)
	if err != nil {
		return PostAnalytics{}, fmt.Errorf("failed to record post analytics: %w", err)
	}
	return pa, nil
}

const sqlGetAnalyticsByPlatformPost = `
SELECT id, platform_post_id, platform, impressions, likes, comments, shares, clicks, collected_at, created_at
FROM post_analytics
WHERE platform_post_id = $1
ORDER BY collected_at DESC
`

func (s *Store) GetAnalyticsByPlatformPost(ctx context.Context, platformPostID uuid.UUID) ([]PostAnalytics, error) {
	var analytics []PostAnalytics
	err := s.db.SelectContext(ctx, &analytics, sqlGetAnalyticsByPlatformPost, platformPostID)
	if err != nil {
		return nil, fmt.Errorf("failed to get analytics by platform post: %w", err)
	}
	return analytics, nil
}

// AnalyticsOverview represents aggregated analytics for an account
type AnalyticsOverview struct {
	TotalImpressions int `db:"total_impressions" json:"total_impressions"`
	TotalLikes       int `db:"total_likes" json:"total_likes"`
	TotalComments    int `db:"total_comments" json:"total_comments"`
	TotalShares      int `db:"total_shares" json:"total_shares"`
	TotalClicks      int `db:"total_clicks" json:"total_clicks"`
}

const sqlGetAnalyticsOverview = `
SELECT
    COALESCE(SUM(pa.impressions), 0) as total_impressions,
    COALESCE(SUM(pa.likes), 0) as total_likes,
    COALESCE(SUM(pa.comments), 0) as total_comments,
    COALESCE(SUM(pa.shares), 0) as total_shares,
    COALESCE(SUM(pa.clicks), 0) as total_clicks
FROM post_analytics pa
JOIN platform_posts pp ON pp.id = pa.platform_post_id
JOIN posts p ON p.id = pp.post_id
WHERE p.account_id = $1 AND p.deleted_at IS NULL
AND pa.collected_at >= $2 AND pa.collected_at <= $3
`

func (s *Store) GetAnalyticsOverview(ctx context.Context, accountID uuid.UUID, from, to time.Time) (AnalyticsOverview, error) {
	var overview AnalyticsOverview
	err := s.db.GetContext(ctx, &overview, sqlGetAnalyticsOverview, accountID, from, to)
	if err != nil {
		return AnalyticsOverview{}, fmt.Errorf("failed to get analytics overview: %w", err)
	}
	return overview, nil
}

// AnalyticsTimeSeries represents a single data point in a time series
type AnalyticsTimeSeries struct {
	Date        time.Time `db:"date" json:"date"`
	Impressions int       `db:"impressions" json:"impressions"`
	Likes       int       `db:"likes" json:"likes"`
	Comments    int       `db:"comments" json:"comments"`
	Shares      int       `db:"shares" json:"shares"`
	Clicks      int       `db:"clicks" json:"clicks"`
}

const sqlGetAnalyticsTimeSeries = `
SELECT
    DATE_TRUNC('day', pa.collected_at) as date,
    COALESCE(SUM(pa.impressions), 0) as impressions,
    COALESCE(SUM(pa.likes), 0) as likes,
    COALESCE(SUM(pa.comments), 0) as comments,
    COALESCE(SUM(pa.shares), 0) as shares,
    COALESCE(SUM(pa.clicks), 0) as clicks
FROM post_analytics pa
JOIN platform_posts pp ON pp.id = pa.platform_post_id
JOIN posts p ON p.id = pp.post_id
WHERE p.account_id = $1 AND p.deleted_at IS NULL
AND pa.collected_at >= $2 AND pa.collected_at <= $3
GROUP BY DATE_TRUNC('day', pa.collected_at)
ORDER BY date ASC
`

func (s *Store) GetAnalyticsTimeSeries(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]AnalyticsTimeSeries, error) {
	var series []AnalyticsTimeSeries
	err := s.db.SelectContext(ctx, &series, sqlGetAnalyticsTimeSeries, accountID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to get analytics time series: %w", err)
	}
	return series, nil
}

// PlatformAnalytics represents analytics breakdown by platform
type PlatformAnalytics struct {
	Platform    string `db:"platform" json:"platform"`
	Impressions int    `db:"impressions" json:"impressions"`
	Likes       int    `db:"likes" json:"likes"`
	Comments    int    `db:"comments" json:"comments"`
	Shares      int    `db:"shares" json:"shares"`
	Clicks      int    `db:"clicks" json:"clicks"`
}

const sqlGetAnalyticsByPlatform = `
SELECT
    pa.platform,
    COALESCE(SUM(pa.impressions), 0) as impressions,
    COALESCE(SUM(pa.likes), 0) as likes,
    COALESCE(SUM(pa.comments), 0) as comments,
    COALESCE(SUM(pa.shares), 0) as shares,
    COALESCE(SUM(pa.clicks), 0) as clicks
FROM post_analytics pa
JOIN platform_posts pp ON pp.id = pa.platform_post_id
JOIN posts p ON p.id = pp.post_id
WHERE p.account_id = $1 AND p.deleted_at IS NULL
AND pa.collected_at >= $2 AND pa.collected_at <= $3
GROUP BY pa.platform
ORDER BY impressions DESC
`

func (s *Store) GetAnalyticsByPlatform(ctx context.Context, accountID uuid.UUID, from, to time.Time) ([]PlatformAnalytics, error) {
	var analytics []PlatformAnalytics
	err := s.db.SelectContext(ctx, &analytics, sqlGetAnalyticsByPlatform, accountID, from, to)
	if err != nil {
		return nil, fmt.Errorf("failed to get analytics by platform: %w", err)
	}
	return analytics, nil
}
