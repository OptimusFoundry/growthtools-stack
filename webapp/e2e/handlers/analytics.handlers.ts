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

	// ── Overview endpoint non-2xx factories ──────────────────────────────────

	/** 400 Bad Request — invalid date range query params */
	overviewBadRequest: () =>
		http.get("*/api/protected/analytics/overview", () => {
			return HttpResponse.json(
				{
					error: "Invalid 'from' date format, expected RFC3339",
					code: "INVALID_INPUT",
				},
				{ status: 400 },
			);
		}),

	/** 401 Unauthorized — missing or invalid session */
	overviewUnauthorized: () =>
		http.get("*/api/protected/analytics/overview", () => {
			return HttpResponse.json(
				{ error: "Account ID not found in context", code: "UNAUTHORIZED" },
				{ status: 401 },
			);
		}),

	/** 500 Internal Server Error — processor failure */
	overviewServerError: () =>
		http.get("*/api/protected/analytics/overview", () => {
			return HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			);
		}),

	/** Transport-level failure — network unreachable */
	overviewNetworkFailure: () =>
		http.get("*/api/protected/analytics/overview", () => {
			return HttpResponse.error();
		}),

	// ── Timeseries endpoint non-2xx factories ────────────────────────────────

	/** 400 Bad Request */
	timeseriesBadRequest: () =>
		http.get("*/api/protected/analytics/timeseries", () => {
			return HttpResponse.json(
				{
					error: "Invalid 'from' date format, expected RFC3339",
					code: "INVALID_INPUT",
				},
				{ status: 400 },
			);
		}),

	/** 401 Unauthorized */
	timeseriesUnauthorized: () =>
		http.get("*/api/protected/analytics/timeseries", () => {
			return HttpResponse.json(
				{ error: "Account ID not found in context", code: "UNAUTHORIZED" },
				{ status: 401 },
			);
		}),

	/** 500 Internal Server Error */
	timeseriesServerError: () =>
		http.get("*/api/protected/analytics/timeseries", () => {
			return HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			);
		}),

	/** Transport-level failure */
	timeseriesNetworkFailure: () =>
		http.get("*/api/protected/analytics/timeseries", () => {
			return HttpResponse.error();
		}),

	// ── Platforms endpoint non-2xx factories ─────────────────────────────────

	/** 400 Bad Request */
	platformsBadRequest: () =>
		http.get("*/api/protected/analytics/platforms", () => {
			return HttpResponse.json(
				{
					error: "Invalid 'from' date format, expected RFC3339",
					code: "INVALID_INPUT",
				},
				{ status: 400 },
			);
		}),

	/** 401 Unauthorized */
	platformsUnauthorized: () =>
		http.get("*/api/protected/analytics/platforms", () => {
			return HttpResponse.json(
				{ error: "Account ID not found in context", code: "UNAUTHORIZED" },
				{ status: 401 },
			);
		}),

	/** 500 Internal Server Error */
	platformsServerError: () =>
		http.get("*/api/protected/analytics/platforms", () => {
			return HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			);
		}),

	/** Transport-level failure */
	platformsNetworkFailure: () =>
		http.get("*/api/protected/analytics/platforms", () => {
			return HttpResponse.error();
		}),
};
