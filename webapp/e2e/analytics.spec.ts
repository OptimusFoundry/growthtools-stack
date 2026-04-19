/**
 * Analytics E2E Tests
 *
 * Tests for the analytics dashboard page.
 *
 * Endpoint coverage:
 *   GET /api/protected/analytics/overview   → 200, 400, 401, 500, network error
 *   GET /api/protected/analytics/timeseries → 200, 400, 401, 500, network error
 *   GET /api/protected/analytics/platforms  → 200, 400, 401, 500, network error
 *
 * UI behaviour on non-2xx: the fetcher throws, useAnalytics catches the error
 * and leaves `overview` as null. The component renders the EmptyState branch
 * ("No Analytics Data") for all error scenarios — there is no distinct error
 * banner in the current implementation.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";

// ── Shared status-code table type ────────────────────────────────────────────

interface StatusCodeCase {
	readonly status: number;
	readonly body: { error: string; code?: string };
	readonly label: string;
}

// ── Status-code table: codes each endpoint can return ────────────────────────

const overviewStatusCases: StatusCodeCase[] = [
	{
		status: 400,
		body: {
			error: "Invalid 'from' date format, expected RFC3339",
			code: "INVALID_INPUT",
		},
		label: "bad request — invalid date param",
	},
	{
		status: 401,
		body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
		label: "unauthorized — missing session",
	},
	{
		status: 500,
		body: {
			error: "An internal error occurred. Please try again later.",
			code: "INTERNAL_ERROR",
		},
		label: "internal server error",
	},
];

const timeseriesStatusCases: StatusCodeCase[] = [
	{
		status: 400,
		body: {
			error: "Invalid 'from' date format, expected RFC3339",
			code: "INVALID_INPUT",
		},
		label: "bad request — invalid date param",
	},
	{
		status: 401,
		body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
		label: "unauthorized — missing session",
	},
	{
		status: 500,
		body: {
			error: "An internal error occurred. Please try again later.",
			code: "INTERNAL_ERROR",
		},
		label: "internal server error",
	},
];

const platformsStatusCases: StatusCodeCase[] = [
	{
		status: 400,
		body: {
			error: "Invalid 'from' date format, expected RFC3339",
			code: "INVALID_INPUT",
		},
		label: "bad request — invalid date param",
	},
	{
		status: 401,
		body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
		label: "unauthorized — missing session",
	},
	{
		status: 500,
		body: {
			error: "An internal error occurred. Please try again later.",
			code: "INTERNAL_ERROR",
		},
		label: "internal server error",
	},
];

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Analytics", () => {
	// =========================================================================
	// Page Load — golden path
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows analytics page with data", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/analytics/i)).toBeVisible();
		});

		test("shows stats cards", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			// Verify stats cards are present in the page
			const content = await page.textContent("body");
			expect(content).toMatch(/impressions/i);
			expect(content).toMatch(/likes/i);
			expect(content).toMatch(/comments/i);
			expect(content).toMatch(/shares/i);
		});

		test("shows platform breakdown table", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/platform breakdown/i)).toBeVisible();
			await expect(page.getByText(/linkedin/i)).toBeVisible();
		});
	});

	// =========================================================================
	// Empty State
	// =========================================================================

	test.describe("Empty State", () => {
		test("shows empty state when no analytics data", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () => {
					return HttpResponse.json(null);
				}),
				http.get("*/api/protected/analytics/timeseries", () => {
					return HttpResponse.json([]);
				}),
				http.get("*/api/protected/analytics/platforms", () => {
					return HttpResponse.json([]);
				}),
			);

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/no analytics data/i)).toBeVisible();
		});
	});

	// =========================================================================
	// Status Code Coverage — GET /api/protected/analytics/overview
	// =========================================================================

	test.describe("Status Code Coverage — GET /analytics/overview", () => {
		for (const tc of overviewStatusCases) {
			test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
				network.use(
					http.get("*/api/protected/analytics/overview", () => {
						return HttpResponse.json(tc.body, { status: tc.status });
					}),
				);

				await page.goto("/analytics");
				await page.waitForLoadState("networkidle");

				// Any non-2xx on the overview endpoint leaves `overview` null,
				// causing the EmptyState branch to render.
				await expect(page.getByText(/no analytics data/i)).toBeVisible();
			});
		}

		test("handles transport failure (network error)", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () => {
					return HttpResponse.error();
				}),
			);

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/no analytics data/i)).toBeVisible();
		});
	});

	// =========================================================================
	// Status Code Coverage — GET /api/protected/analytics/timeseries
	// =========================================================================

	test.describe("Status Code Coverage — GET /analytics/timeseries", () => {
		for (const tc of timeseriesStatusCases) {
			test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
				network.use(
					http.get("*/api/protected/analytics/timeseries", () => {
						return HttpResponse.json(tc.body, { status: tc.status });
					}),
				);

				await page.goto("/analytics");
				await page.waitForLoadState("networkidle");

				// A timeseries failure is part of the same Promise.all — any
				// rejection sets error and leaves overview null → EmptyState.
				await expect(page.getByText(/no analytics data/i)).toBeVisible();
			});
		}

		test("handles transport failure (network error)", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/analytics/timeseries", () => {
					return HttpResponse.error();
				}),
			);

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/no analytics data/i)).toBeVisible();
		});
	});

	// =========================================================================
	// Status Code Coverage — GET /api/protected/analytics/platforms
	// =========================================================================

	test.describe("Status Code Coverage — GET /analytics/platforms", () => {
		for (const tc of platformsStatusCases) {
			test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
				network.use(
					http.get("*/api/protected/analytics/platforms", () => {
						return HttpResponse.json(tc.body, { status: tc.status });
					}),
				);

				await page.goto("/analytics");
				await page.waitForLoadState("networkidle");

				// A platforms failure is part of the same Promise.all — any
				// rejection sets error and leaves overview null → EmptyState.
				await expect(page.getByText(/no analytics data/i)).toBeVisible();
			});
		}

		test("handles transport failure (network error)", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/analytics/platforms", () => {
					return HttpResponse.error();
				}),
			);

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/no analytics data/i)).toBeVisible();
		});
	});
});
