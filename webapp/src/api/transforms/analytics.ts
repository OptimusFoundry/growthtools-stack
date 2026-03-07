/**
 * Analytics Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) analytics types
 */

import type {
	AnalyticsOverview,
	PlatformBreakdown,
	TimeSeriesDataPoint,
} from "@/types/analytics";
import type {
	ApiAnalyticsOverview,
	ApiPlatformBreakdown,
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
