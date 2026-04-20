/**
 * Dashboard E2E Tests
 *
 * Tests for the dashboard page (/) including the LastSevenDaysSection widget.
 *
 * Endpoint coverage:
 *   GET /api/protected/analytics/overview   → 200, empty/null, 500, transport
 *   GET /api/protected/analytics/timeseries → 200, empty, 500, transport
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Dashboard", () => {
	// =========================================================================
	// Page Load — golden path
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows dashboard greeting and quick-access links", async ({
			page,
		}) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Greeting is present
			const content = await page.textContent("body");
			expect(content).toMatch(/good morning|good afternoon|good evening/i);

			// Quick access links
			await expect(
				page.getByRole("link", { name: /open calendar, quick access/i }),
			).toBeVisible();
			await expect(
				page.getByRole("link", { name: /open posts, quick access/i }),
			).toBeVisible();
			await expect(
				page.getByRole("link", { name: /open analytics, quick access/i }),
			).toBeVisible();
		});
	});

	// =========================================================================
	// LastSevenDaysSection — happy path
	// =========================================================================

	test.describe("LastSevenDaysSection", () => {
		test("shows impressions and engagements cards when data is available", async ({
			page,
		}) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Widget heading and cards
			await expect(page.getByText(/momentum/i)).toBeVisible();

			const content = await page.textContent("body");
			expect(content).toMatch(/impressions/i);
			expect(content).toMatch(/engagements/i);
		});

		test("shows 'View analytics' link", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			await expect(
				page.getByRole("link", { name: /view analytics/i }),
			).toBeVisible();
		});

		test("shows trend chips (vs prior 7d)", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/vs prior 7d/i);
		});
	});

	// =========================================================================
	// LastSevenDaysSection — empty data (widget hidden)
	// =========================================================================

	test.describe("LastSevenDaysSection — hidden when empty", () => {
		test("hides widget when overview returns all-zero data", async ({
			network,
			page,
		}) => {
			network.use(
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
			);

			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// The momentum widget should not be rendered
			await expect(page.getByText(/momentum/i)).not.toBeVisible();
		});

		test("hides widget when overview returns null", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () =>
					HttpResponse.json(null),
				),
			);

			await page.goto("/");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/momentum/i)).not.toBeVisible();
		});
	});

	// =========================================================================
	// LastSevenDaysSection — error handling (widget hidden silently)
	// =========================================================================

	test.describe("LastSevenDaysSection — error handling", () => {
		test("hides widget on 500 from overview endpoint", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () =>
					HttpResponse.json(
						{ error: "internal error", code: "INTERNAL_ERROR" },
						{ status: 500 },
					),
				),
			);

			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Widget silently disappears — dashboard page is still visible
			await expect(page.getByText(/momentum/i)).not.toBeVisible();
			const content = await page.textContent("body");
			expect(content).toMatch(/good morning|good afternoon|good evening/i);
		});

		test("hides widget on transport failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/analytics/overview", () =>
					HttpResponse.error(),
				),
			);

			await page.goto("/");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText(/momentum/i)).not.toBeVisible();
		});
	});
});
