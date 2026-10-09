/**
 * Post Analytics E2E Tests
 *
 * Tests for the /posts/$id/analytics detail page.
 *
 * Endpoint coverage:
 *   GET /api/protected/posts/:id/analytics → 200, 401, 403, 404, 500, transport
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { analyticsScenarios } from "./handlers/analytics.handlers";

// ── Status-code table ─────────────────────────────────────────────────────────

interface StatusCodeCase {
	readonly status: number;
	readonly body: { error: string; code?: string };
	readonly label: string;
}

const analyticsStatusCases: StatusCodeCase[] = [
	{
		status: 401,
		body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
		label: "unauthorized — missing session",
	},
	{
		status: 403,
		body: { error: "Forbidden", code: "FORBIDDEN" },
		label: "forbidden — insufficient permissions",
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

test.describe("Post Analytics", () => {
	// =========================================================================
	// Page Load — happy path
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows analytics cards for each platform", async ({ page }) => {
			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			// Breadcrumb should render
			await expect(page.getByText(/posts/i).first()).toBeVisible();

			// Platform badges should be visible
			await expect(page.getByText("X", { exact: true })).toBeVisible();
			await expect(page.getByText("Threads", { exact: true })).toBeVisible();
		});

		test("shows KPI metrics for each platform card", async ({ page }) => {
			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			// KPI labels appear at least once
			const content = await page.textContent("body");
			expect(content).toMatch(/impressions/i);
			expect(content).toMatch(/likes/i);
		});

		test("shows external link for platforms with post_url", async ({
			page,
		}) => {
			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByRole("link", { name: "Open on X" })).toBeVisible();
			await expect(
				page.getByRole("link", { name: "Open on Threads" }),
			).toBeVisible();
		});
	});

	// =========================================================================
	// Empty State — no platform posts
	// =========================================================================

	test.describe("Empty State", () => {
		test("shows no-analytics message when platform_posts is empty", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/posts/:id/analytics", () =>
					HttpResponse.json({ platform_posts: [] }),
				),
			);

			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			await expect(
				page.getByRole("heading", { name: /no analytics yet/i }),
			).toBeVisible();
		});
	});

	// =========================================================================
	// Unavailable State
	// =========================================================================

	test.describe("Analytics Unavailable", () => {
		test("shows 'Analytics unavailable' badge when analytics_unavailable_at is set", async ({
			network,
			page,
		}) => {
			network.use(...analyticsScenarios.postAnalyticsUnavailable());

			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			await expect(page.getByText("Analytics unavailable")).toBeVisible();
		});
	});

	// =========================================================================
	// 404 State
	// =========================================================================

	test.describe("Not Found", () => {
		test("shows the empty state on 404", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/posts/:id/analytics", () =>
					HttpResponse.json(
						{ error: "post not found", code: "NOT_FOUND" },
						{ status: 404 },
					),
				),
			);

			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			await expect(
				page.getByRole("heading", { name: /no analytics yet/i }),
			).toBeVisible();
		});
	});

	// =========================================================================
	// Error States
	// =========================================================================

	test.describe("Error States", () => {
		for (const tc of analyticsStatusCases) {
			test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
				network.use(
					http.get("*/api/protected/posts/:id/analytics", () =>
						HttpResponse.json(tc.body, { status: tc.status }),
					),
				);

				await page.goto("/posts/post_1/analytics");
				await page.waitForLoadState("networkidle");

				await expect(
					page
						.getByRole("alert")
						.filter({ hasText: /couldn't load analytics/i }),
				).toBeVisible();
				await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
			});
		}

		test("handles transport failure (network error)", async ({
			network,
			page,
		}) => {
			network.use(
				http.get("*/api/protected/posts/:id/analytics", () =>
					HttpResponse.error(),
				),
			);

			await page.goto("/posts/post_1/analytics");
			await page.waitForLoadState("networkidle");

			await expect(
				page.getByRole("alert").filter({ hasText: /couldn't load analytics/i }),
			).toBeVisible();
			await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
		});
	});
});
