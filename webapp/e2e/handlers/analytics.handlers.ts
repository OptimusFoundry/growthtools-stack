/**
 * Analytics API handlers
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import {
	analyticsOverview,
	analyticsTimeseries,
	platformBreakdown,
	postAnalyticsWithTwoPlatforms,
} from "../mocks/data";

export const analyticsEndpoints = {
	overview: setupEndpoint(
		"GET",
		"*/api/protected/analytics/overview",
		analyticsOverview,
	),
	timeseries: setupEndpoint(
		"GET",
		"*/api/protected/analytics/timeseries",
		analyticsTimeseries,
	),
	platforms: setupEndpoint(
		"GET",
		"*/api/protected/analytics/platforms",
		platformBreakdown,
	),
	postAnalytics: setupEndpoint(
		"GET",
		"*/api/protected/posts/:id/analytics",
		postAnalyticsWithTwoPlatforms,
	),
};

export const analyticsHandlers = Object.values(analyticsEndpoints).map((e) =>
	e[200](),
);

export const analyticsScenarios = {
	/** No analytics data — every endpoint returns an empty/null body. */
	empty: () => [
		http.get("*/api/protected/analytics/overview", () =>
			HttpResponse.json(null),
		),
		http.get("*/api/protected/analytics/timeseries", () =>
			HttpResponse.json([]),
		),
		http.get("*/api/protected/analytics/platforms", () =>
			HttpResponse.json([]),
		),
	],
	/** Connected nothing yet — zero totals and no platforms trigger the page's isNoPlatforms branch. */
	noPlatforms: () => [
		http.get("*/api/protected/analytics/overview", () =>
			HttpResponse.json({
				total_impressions: 0,
				total_likes: 0,
				total_comments: 0,
				total_shares: 0,
				total_clicks: 0,
				engagement_rate: 0,
			}),
		),
		http.get("*/api/protected/analytics/timeseries", () =>
			HttpResponse.json([]),
		),
		http.get("*/api/protected/analytics/platforms", () =>
			HttpResponse.json([]),
		),
	],
	/** Post analytics with no platform posts (post not yet published). */
	postAnalyticsEmpty: () => [
		http.get("*/api/protected/posts/:id/analytics", () =>
			HttpResponse.json({ platform_posts: [] }),
		),
	],
	/** Post analytics where one platform has become unavailable. */
	postAnalyticsUnavailable: () => [
		http.get("*/api/protected/posts/:id/analytics", () =>
			HttpResponse.json({
				platform_posts: [
					{
						platform_post_id: "pp_x_1",
						platform: "x",
						status: "published",
						published_at: "2025-12-15T10:00:00Z",
						post_url: "https://x.com/testuser/status/123456",
						analytics_unavailable_at: "2025-12-18T00:00:00Z",
						latest: {
							impressions: 4200,
							likes: 310,
							comments: 62,
							shares: 31,
							clicks: 103,
							collected_at: "2025-12-18T00:00:00Z",
						},
						history: [],
					},
				],
			}),
		),
	],
};
