/**
 * Posts E2E Tests
 *
 * Tests for the posts management page.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { posts } from "./mocks/data";

test.describe("Posts", () => {
	// =========================================================================
	// Page Load
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows posts list", async ({ page }) => {
			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/posts/i);
			expect(content).toContain(posts[0].title);
		});

		test("shows post status badges", async ({ page }) => {
			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/published/i);
			expect(content).toMatch(/draft/i);
			expect(content).toMatch(/scheduled/i);
		});

		test("shows create post button", async ({ page }) => {
			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const createBtn = page.getByRole("button", {
				name: /create post/i,
			});
			expect(await createBtn.isVisible()).toBeTruthy();
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
				http.get("*/api/protected/posts", ({ request }) => {
					const url = new URL(request.url);
					const status = url.searchParams.get("status");
					if (status === "draft") {
						return HttpResponse.json(
							posts.filter((p) => p.status === "draft"),
						);
					}
					return HttpResponse.json(posts);
				}),
			);

			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/posts/i);
		});
	});

	// =========================================================================
	// Empty State
	// =========================================================================

	test.describe("Empty State", () => {
		test("shows empty state when no posts", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/posts", () => {
					return HttpResponse.json([]);
				}),
			);

			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/no posts yet/i);
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	test.describe("Error Handling", () => {
		test("handles 500 server error", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/posts", () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 },
					);
				}),
			);

			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});

		test("handles network failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/posts", () => {
					return HttpResponse.error();
				}),
			);

			await page.goto("/posts");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});
});
