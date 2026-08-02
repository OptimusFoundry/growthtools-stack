/**
 * Blog — Site Publish E2E Tests
 *
 * Split out of blog.spec.ts (see frontend-e2e-rules "keeping spec files
 * bounded") to cover the site-publish-to-shubhanshu.dev status surface on
 * the blog detail/edit page, plus the publish-flow navigation regression.
 *
 * Endpoints exercised:
 *   GET  /api/protected/blog/:id                    → 200, 404
 *   POST /api/protected/blog/:id/publish             → 200 (envelope), 404, 500
 *   POST /api/protected/blog/:id/retry-site-publish  → 200, 404, 409, 401, 500, transport
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import {
	blogEndpoints,
	blogScenarios,
	fullBlogPost,
} from "./handlers/blog.handlers";
import { blogPosts } from "./mocks/data";

const postId = blogPosts[0].id;
const detailUrl = `/blog/${postId}`;

test.describe("Blog Detail — Site Publish Status", () => {
	test("no PR yet — status row absent", async ({ network, page }) => {
		network.use(blogEndpoints.get[200]());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		await expect(
			page.getByRole("link", { name: /pushed to github/i }),
		).not.toBeVisible();
		await expect(
			page.getByRole("button", { name: /retry/i }),
		).not.toBeVisible();
	});

	test("PR opened — link visible, opens in new tab, href matches fixture", async ({
		network,
		page,
	}) => {
		network.use(blogScenarios.getWithPr());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		const prLink = page.getByRole("link", { name: /pushed to github/i });
		await expect(prLink).toBeVisible();
		await expect(prLink).toHaveAttribute(
			"href",
			"https://github.com/shubhanshu-dev/site/pull/42",
		);
		await expect(prLink).toHaveAttribute("target", "_blank");
	});

	test("site publish error — alert shown with retry button", async ({
		network,
		page,
	}) => {
		network.use(blogScenarios.getPublishedNoPr());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		network.use(blogScenarios.publishWithSiteError());
		await page
			.getByRole("button", { name: /publish/i })
			.first()
			.click();
		await page.waitForLoadState("networkidle");

		const statusRow = page.getByRole("region", {
			name: /site publish status/i,
		});
		const statusAlert = statusRow.getByRole("alert");
		await expect(statusAlert).toContainText(
			"GitHub publish failed: rate limited",
		);
		await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
	});

	test("retry click succeeds — alert clears, PR link appears", async ({
		network,
		page,
	}) => {
		network.use(blogScenarios.getPublishedNoPr());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		network.use(blogScenarios.publishWithSiteError());
		await page
			.getByRole("button", { name: /publish/i })
			.first()
			.click();
		await page.waitForLoadState("networkidle");
		const statusRow = page.getByRole("region", {
			name: /site publish status/i,
		});
		await expect(statusRow.getByRole("alert")).toContainText(
			"GitHub publish failed: rate limited",
		);

		network.use(blogScenarios.retrySitePublishSuccess());
		await page.getByRole("button", { name: /retry/i }).click();
		await page.waitForLoadState("networkidle");

		// Once retry succeeds, the status row switches from the error branch to
		// the success branch (PR link, no error alert). A global "Blog post
		// published" success banner may also be on screen at this point, so a
		// page-wide getByRole("alert") count is ambiguous — assert directly
		// that the PR link (the success-branch marker) is visible instead.
		await expect(
			page.getByRole("link", { name: /pushed to github/i }),
		).toBeVisible();
	});

	test("retry click fails — alert persists", async ({ network, page }) => {
		network.use(blogScenarios.getPublishedNoPr());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		network.use(blogScenarios.publishWithSiteError());
		await page
			.getByRole("button", { name: /publish/i })
			.first()
			.click();
		await page.waitForLoadState("networkidle");

		network.use(
			http.post("*/api/protected/blog/:id/retry-site-publish", () =>
				HttpResponse.json(
					{ error: "Internal server error", code: "INTERNAL_ERROR" },
					{ status: 500 },
				),
			),
		);
		await page.getByRole("button", { name: /retry/i }).click();
		await page.waitForLoadState("networkidle");

		const statusRow = page.getByRole("region", {
			name: /site publish status/i,
		});
		await expect(statusRow.getByRole("alert")).toBeVisible();
	});

	// =========================================================================
	// Status Code Coverage — POST /api/protected/blog/:id/retry-site-publish
	// =========================================================================

	const retryCases = [
		{
			status: 404,
			body: { error: "Blog post not found", code: "NOT_FOUND" },
			expect: /not found/i,
			label: "not found",
		},
		{
			status: 409,
			body: {
				error: "Blog post is not published yet",
				code: "BLOG_NOT_PUBLISHED",
			},
			expect: /not published yet/i,
			label: "not published yet",
		},
		{
			status: 500,
			body: { error: "Internal server error", code: "INTERNAL_ERROR" },
			expect: /error|something went wrong|failed|unavailable/i,
			label: "server error",
		},
		{
			status: 401,
			body: { error: "Unauthorized", code: "UNAUTHORIZED" },
			expect: /unauthorized|sign in|log in/i,
			label: "unauthorized",
		},
	] as const;

	for (const tc of retryCases) {
		test(`POST /blog/:id/retry-site-publish handles ${tc.status} — ${tc.label}`, async ({
			network,
			page,
		}) => {
			network.use(blogScenarios.getPublishedNoPr());

			await page.goto(detailUrl);
			await page.waitForLoadState("networkidle");

			network.use(blogScenarios.publishWithSiteError());
			await page
				.getByRole("button", { name: /publish/i })
				.first()
				.click();
			await page.waitForLoadState("networkidle");

			network.use(
				http.post("*/api/protected/blog/:id/retry-site-publish", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);
			await page.getByRole("button", { name: /retry/i }).click();
			await page.waitForLoadState("networkidle");

			const statusRow = page.getByRole("region", {
				name: /site publish status/i,
			});
			const alert = statusRow.getByRole("alert");
			await expect(alert).toBeVisible();
			await expect(alert).toContainText(tc.expect);
		});
	}

	test("POST /blog/:id/retry-site-publish handles transport failure", async ({
		network,
		page,
	}) => {
		network.use(blogScenarios.getPublishedNoPr());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		network.use(blogScenarios.publishWithSiteError());
		await page
			.getByRole("button", { name: /publish/i })
			.first()
			.click();
		await page.waitForLoadState("networkidle");

		network.use(
			http.post("*/api/protected/blog/:id/retry-site-publish", () =>
				HttpResponse.error(),
			),
		);
		await page.getByRole("button", { name: /retry/i }).click();
		await page.waitForLoadState("networkidle");

		const statusRow = page.getByRole("region", {
			name: /site publish status/i,
		});
		await expect(statusRow.getByRole("alert")).toBeVisible();
	});
});

test.describe("Blog Publish Flow", () => {
	test("successful publish stays on the detail page (does not navigate to /blog)", async ({
		network,
		page,
	}) => {
		network.use(blogEndpoints.get[200]());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		await page
			.getByRole("button", { name: /publish/i })
			.first()
			.click();
		await page.waitForLoadState("networkidle");

		await expect(page).toHaveURL(new RegExp(`/blog/${fullBlogPost.id}$`));
	});

	test("publish with a site-publish error shows a warning banner, not a flat success banner", async ({
		network,
		page,
	}) => {
		network.use(blogEndpoints.get[200]());
		network.use(blogScenarios.publishWithSiteError());

		await page.goto(detailUrl);
		await page.waitForLoadState("networkidle");

		await page
			.getByRole("button", { name: /publish/i })
			.first()
			.click();
		await page.waitForLoadState("networkidle");

		await expect(
			page.getByText("Blog post published, but the GitHub push failed"),
		).toBeVisible();
		await expect(
			page.getByText("Blog post published", { exact: true }),
		).not.toBeVisible();
	});
});
