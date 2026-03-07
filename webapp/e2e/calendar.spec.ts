/**
 * Calendar E2E Tests
 *
 * Tests for the content calendar page.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";

test.describe("Calendar", () => {
	// =========================================================================
	// Page Load
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows calendar page", async ({ page }) => {
			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/content calendar/i);
		});

		test("shows calendar grid with day headers", async ({ page }) => {
			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/sun/i);
			expect(content).toMatch(/mon/i);
			expect(content).toMatch(/tue/i);
			expect(content).toMatch(/wed/i);
			expect(content).toMatch(/thu/i);
			expect(content).toMatch(/fri/i);
			expect(content).toMatch(/sat/i);
		});

		test("shows current month and year", async ({ page }) => {
			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const now = new Date();
			const monthNames = [
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			];
			const currentMonth = monthNames[now.getMonth()];
			const currentYear = now.getFullYear().toString();

			const content = await page.textContent("body");
			expect(content).toContain(currentMonth);
			expect(content).toContain(currentYear);
		});
	});

	// =========================================================================
	// Navigation
	// =========================================================================

	test.describe("Month Navigation", () => {
		test("has previous and next month buttons", async ({ page }) => {
			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const prevBtn = page.getByLabel(/previous month/i);
			const nextBtn = page.getByLabel(/next month/i);

			expect(await prevBtn.isVisible()).toBeTruthy();
			expect(await nextBtn.isVisible()).toBeTruthy();
		});
	});

	// =========================================================================
	// Posts on Calendar
	// =========================================================================

	test.describe("Scheduled Posts", () => {
		test("renders without error when posts exist", async ({ page }) => {
			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/content calendar/i);
		});

		test("handles empty posts list", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/posts", () => {
					return HttpResponse.json([]);
				}),
			);

			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/content calendar/i);
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	test.describe("Error Handling", () => {
		test("handles posts API failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/posts", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			await page.goto("/calendar");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});
});
