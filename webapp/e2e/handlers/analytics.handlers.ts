/**
 * Analytics API handlers
 */
import { HttpResponse, http } from "msw";
import {
	analyticsOverview,
	analyticsTimeseries,
	platformBreakdown,
} from "../mocks/data";

/**
 * Default handlers - returns analytics data
 */
export const analyticsHandlers = [
	// Overview
	http.get("*/api/protected/analytics/overview", () => {
		return HttpResponse.json(analyticsOverview);
	}),

	// Time series
	http.get("*/api/protected/analytics/timeseries", () => {
		return HttpResponse.json(analyticsTimeseries);
	}),

	// Platform breakdown
	http.get("*/api/protected/analytics/platforms", () => {
		return HttpResponse.json(platformBreakdown);
	}),
];

/**
 * Scenario factories for test overrides
 */
export const analyticsScenarios = {
	/** No analytics data */
	empty: () => [
		http.get("*/api/protected/analytics/overview", () => {
			return HttpResponse.json(null);
		}),
		http.get("*/api/protected/analytics/timeseries", () => {
			return HttpResponse.json([]);
		}),
		http.get("*/api/protected/analytics/platforms", () => {
			return HttpResponse.json([]);
		}),
	],

	/** Server error on overview */
	serverError: () =>
		http.get("*/api/protected/analytics/overview", () => {
			return HttpResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}),
};
