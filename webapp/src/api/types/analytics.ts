/**
 * Analytics API Types
 *
 * API response types for analytics (snake_case, matches Go JSON tags)
 */

export interface ApiAnalyticsOverview {
	total_impressions: number;
	total_likes: number;
	total_comments: number;
	total_shares: number;
	total_clicks: number;
	engagement_rate: number;
}

export interface ApiTimeSeriesDataPoint {
	date: string;
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
}

export interface ApiPlatformBreakdown {
	platform: string;
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
}

// ── Per-post analytics (new endpoint: GET /posts/:id/analytics) ──────────────

export interface ApiAnalyticsSnapshot {
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
	collected_at: string;
}

export interface ApiPlatformPostAnalytics {
	platform_post_id: string;
	platform: string;
	status: string;
	published_at: string | null;
	post_url: string | null;
	analytics_unavailable_at: string | null;
	latest: ApiAnalyticsSnapshot | null;
	history: ApiAnalyticsSnapshot[];
}

export interface ApiPostAnalytics {
	platform_posts: ApiPlatformPostAnalytics[];
}
