/**
 * Analytics Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) analytics types
 */

import type {
	AnalyticsOverview,
	AnalyticsSnapshot,
	PlatformBreakdown,
	PlatformPostAnalytics,
	PostAnalytics,
	TimeSeriesDataPoint,
} from "@/types/analytics";
import type {
	ApiAnalyticsOverview,
	ApiAnalyticsSnapshot,
	ApiPlatformBreakdown,
	ApiPlatformPostAnalytics,
	ApiPostAnalytics,
	ApiTimeSeriesDataPoint,
} from "../types/analytics";

export function toAnalyticsOverview(
	api: ApiAnalyticsOverview,
): AnalyticsOverview {
	return {
		totalImpressions: api.total_impressions,
		totalLikes: api.total_likes,
		totalComments: api.total_comments,
		totalShares: api.total_shares,
		totalClicks: api.total_clicks,
		engagementRate: api.engagement_rate,
	};
}

export function toTimeSeriesDataPoint(
	api: ApiTimeSeriesDataPoint,
): TimeSeriesDataPoint {
	return {
		date: api.date,
		impressions: api.impressions,
		likes: api.likes,
		comments: api.comments,
		shares: api.shares,
		clicks: api.clicks,
	};
}

export function toPlatformBreakdown(
	api: ApiPlatformBreakdown,
): PlatformBreakdown {
	return {
		platform: api.platform,
		impressions: api.impressions,
		likes: api.likes,
		comments: api.comments,
		shares: api.shares,
		clicks: api.clicks,
	};
}

// ── Per-post analytics transforms ────────────────────────────────────────────

export function toAnalyticsSnapshot(
	api: ApiAnalyticsSnapshot,
): AnalyticsSnapshot {
	return {
		impressions: api.impressions,
		likes: api.likes,
		comments: api.comments,
		shares: api.shares,
		clicks: api.clicks,
		collectedAt: api.collected_at,
	};
}

export function toPlatformPostAnalytics(
	api: ApiPlatformPostAnalytics,
): PlatformPostAnalytics {
	return {
		platformPostId: api.platform_post_id,
		platform: api.platform,
		status: api.status,
		publishedAt: api.published_at,
		postUrl: api.post_url,
		analyticsUnavailableAt: api.analytics_unavailable_at,
		latest: api.latest ? toAnalyticsSnapshot(api.latest) : null,
		history: api.history.map(toAnalyticsSnapshot),
	};
}

export function toPostAnalytics(api: ApiPostAnalytics): PostAnalytics {
	return {
		platformPosts: api.platform_posts.map(toPlatformPostAnalytics),
	};
}
