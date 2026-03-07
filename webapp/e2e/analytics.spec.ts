/**
 * Analytics E2E Tests
 *
 * Tests for the analytics dashboard page.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";

test.describe("Analytics", () => {
	// =========================================================================
	// Page Load
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows analytics page with data", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/analytics/i);
		});

		test("shows stats cards", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/impressions/i);
			expect(content).toMatch(/likes/i);
			expect(content).toMatch(/comments/i);
			expect(content).toMatch(/shares/i);
		});

		test("shows platform breakdown table", async ({ page }) => {
			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/platform breakdown/i);
			expect(content).toMatch(/linkedin/i);
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

			const content = await page.textContent("body");
			expect(content).toMatch(/no analytics data/i);
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	test.describe("Error Handling", () => {
		test("handles 500 server error on overview", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});

		test("handles network failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () => {
					return HttpResponse.error();
				}),
				http.get("*/api/protected/analytics/timeseries", () => {
					return HttpResponse.error();
				}),
				http.get("*/api/protected/analytics/platforms", () => {
					return HttpResponse.error();
				}),
			);

			await page.goto("/analytics");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});
});
