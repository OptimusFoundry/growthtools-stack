/**
 * Analytics API handlers
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import {
	analyticsOverview,
	analyticsTimeseries,
	platformBreakdown,
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
};
