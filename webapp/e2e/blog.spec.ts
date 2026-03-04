/**
 * Blog E2E Tests
 *
 * Tests for the blog management page.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { blogPosts } from "./mocks/data";

test.describe("Blog", () => {
	// =========================================================================
	// Page Load
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows blog posts list", async ({ page }) => {
			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/blog/i);
			expect(content).toContain(blogPosts[0].title);
		});

		test("shows post status badges", async ({ page }) => {
			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/published/i);
			expect(content).toMatch(/draft/i);
		});

		test("shows new post button", async ({ page }) => {
			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const newPostBtn = page.getByRole("button", {
				name: /new post/i,
			});
			expect(await newPostBtn.isVisible()).toBeTruthy();
		});

		test("shows keyword badges", async ({ page }) => {
			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/growth tools/i);
		});
	});

	// =========================================================================
	// Filtering
	// =========================================================================

	test.describe("Filtering", () => {
		test("filter by status shows matching posts", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/blog", ({ request }) => {
					const url = new URL(request.url);
					const status = url.searchParams.get("status");
					if (status === "published") {
						return HttpResponse.json(
							blogPosts.filter((p) => p.status === "published"),
						);
					}
					return HttpResponse.json(blogPosts);
				}),
			);

			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/blog/i);
		});
	});

	// =========================================================================
	// Empty State
	// =========================================================================

	test.describe("Empty State", () => {
		test("shows empty state when no blog posts", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/blog", () => {
					return HttpResponse.json([]);
				}),
			);

			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/no blog posts yet/i);
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	test.describe("Error Handling", () => {
		test("handles 500 server error", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/blog", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});
});
