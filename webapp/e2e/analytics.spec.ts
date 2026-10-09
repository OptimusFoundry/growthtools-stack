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
 * UI behaviour on non-2xx: the fetcher throws and useAnalytics records the
 * error, so the page renders an error Alert ("Something went wrong") with a
 * Retry action. A successful response with no connected platforms renders the
 * separate "No platforms connected" empty state.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { analyticsScenarios } from "./handlers/analytics.handlers";

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

			await expect(
				page.getByRole("heading", { level: 1, name: "Analytics" }),
			).toBeVisible();
		});

		test("renders date-range options (7, 30, 90 days)", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const range = page.getByRole("radiogroup", { name: "Date range" });
			for (const name of ["7 days", "30 days", "90 days"]) {
				await expect(
					range.getByRole("radio", { name, exact: true }),
				).toBeVisible();
			}
		});

		test("shows time-series chart area", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByLabel(/impressions over time/i)).toBeVisible();
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

			await expect(
				page.getByRole("heading", { name: /platform breakdown/i }),
			).toBeVisible();
			await expect(page.getByRole("cell", { name: "LinkedIn" })).toBeVisible();
		});
	});

	// =========================================================================
	// Empty State
	// =========================================================================

	test.describe("Empty State", () => {
		test("shows the no-platforms empty state when nothing is connected", async ({
			network,
			page,
		}) => {
			network.use(...analyticsScenarios.noPlatforms());

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			await expect(
				page.getByRole("heading", { name: "No platforms connected" }),
			).toBeVisible();
		});
	});

	// =========================================================================
	// Range and metric switching
	// =========================================================================

	test.describe("Switching", () => {
		test("selecting a date range updates the checked radio", async ({
			page,
		}) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const range = page.getByRole("radiogroup", { name: "Date range" });
			for (const name of ["7 days", "90 days", "30 days"]) {
				const radio = range.getByRole("radio", { name, exact: true });
				await radio.click();
				await expect(radio).toHaveAttribute("aria-checked", "true");
				await expect(range.getByRole("radio", { checked: true })).toHaveCount(
					1,
				);
			}
		});

		test("changing range refetches overview with a new window", async ({
			page,
		}) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const refetch = page.waitForRequest((req) =>
				req.url().includes("/api/protected/analytics/overview"),
			);
			await page
				.getByRole("radiogroup", { name: "Date range" })
				.getByRole("radio", { name: "7 days", exact: true })
				.click();
			await refetch;
		});

		test("selecting a metric updates the checked radio and chart label", async ({
			page,
		}) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const metrics = page.getByRole("radiogroup", { name: "Select metric" });
			for (const name of ["Likes", "Comments", "Shares", "Impressions"]) {
				const radio = metrics.getByRole("radio", { name, exact: true });
				await radio.click();
				await expect(radio).toHaveAttribute("aria-checked", "true");
				await expect(metrics.getByRole("radio", { checked: true })).toHaveCount(
					1,
				);
				await expect(
					page.getByLabel(new RegExp(`^${name} over time$`, "i")),
				).toBeVisible();
			}
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

				// Any non-2xx on the overview endpoint surfaces the error Alert.
				await expect(
					page.getByRole("alert").filter({ hasText: /something went wrong/i }),
				).toBeVisible();
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

			await expect(
				page.getByRole("alert").filter({ hasText: /something went wrong/i }),
			).toBeVisible();
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

				// Part of the same Promise.all — any rejection surfaces the error Alert.
				await expect(
					page.getByRole("alert").filter({ hasText: /something went wrong/i }),
				).toBeVisible();
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

			await expect(
				page.getByRole("alert").filter({ hasText: /something went wrong/i }),
			).toBeVisible();
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

				// Part of the same Promise.all — any rejection surfaces the error Alert.
				await expect(
					page.getByRole("alert").filter({ hasText: /something went wrong/i }),
				).toBeVisible();
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

			await expect(
				page.getByRole("alert").filter({ hasText: /something went wrong/i }),
			).toBeVisible();
		});
	});
});
