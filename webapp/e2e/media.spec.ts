/**
 * Media E2E Tests
 *
 * Tests for the media library page.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { mediaItems } from "./mocks/data";

test.describe("Media", () => {
	// =========================================================================
	// Page Load
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows media grid with items", async ({ page }) => {
			await page.goto("/media");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/media library/i);
			expect(content).toContain(mediaItems[0].filename);
		});

		test("shows upload button", async ({ page }) => {
			await page.goto("/media");
			await page.waitForLoadState("networkidle");

			const uploadBtn = page.getByRole("button", { name: /upload/i });
			expect(await uploadBtn.first().isVisible()).toBeTruthy();
		});

		test("shows file type badges", async ({ page }) => {
			await page.goto("/media");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/png/i);
		});
	});

	// =========================================================================
	// Empty State
	// =========================================================================

	test.describe("Empty State", () => {
		test("shows empty state when no media", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/media", () => {
					return HttpResponse.json([]);
				}),
			);

			await page.goto("/media");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/no media yet/i);
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	test.describe("Error Handling", () => {
		test("handles 500 server error", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/media", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			await page.goto("/media");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});

		test("handles network failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/media", () => {
					return HttpResponse.error();
				}),
			);

			await page.goto("/media");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});
});
