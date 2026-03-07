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
