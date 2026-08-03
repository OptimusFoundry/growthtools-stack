/**
 * Blog — Delete E2E Tests (EP-004 "Delete Blog Posts including live site
 * removal")
 *
 * Split out of blog.spec.ts (see frontend-e2e-rules "keeping spec files
 * bounded") to cover the DELETE endpoint's full contract from both entry
 * points — the list row and the editor topbar.
 *
 * Endpoints exercised:
 *   DELETE /api/protected/blog/:id → 200 {message, site_delete_error?}, 404, 500, transport
 *   GET    /api/protected/blog/:id → 200 (editor initial load, varies sitePrUrl/status per case)
 *   GET    /api/protected/blogs    → 200 (list row entry point)
 *
 * THIS FILE IS EXPECTED TO BE RED until F2/F3 land — the delete button is
 * currently gated to draft-only posts (list row: `post.status === "draft"`,
 * editor: `postStatus === "draft"`), and the confirm-modal copy is a fixed
 * string. See docs/plans/2026-08-03-blog-delete.md ticket F4.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import {
	blogEndpoints,
	blogScenarios,
	fullBlogPost,
	publishedBlogWithPr,
} from "./handlers/blog.handlers";
import { blogPosts } from "./mocks/data";

const DELETE_BUTTON_NAME = /delete blog post/i;
const DIALOG_NAME = /delete blog post/i;
const LIVE_COPY = /live on shubhanshu\.dev/i;
const DEFAULT_COPY = /cannot be undone/i;
const SITE_ERROR_BANNER = /site removal failed/i;
const DISMISS_BUTTON_NAME = /dismiss banner/i;

async function openListDeleteDialog(
	page: import("@playwright/test").Page,
	title: string,
) {
	await page.goto("/blog");
	await page.waitForLoadState("networkidle");
	await page
		.getByRole("button", {
			name: new RegExp(`delete blog post "${title}"`, "i"),
		})
		.click();
	return page.getByRole("dialog", { name: DIALOG_NAME });
}

async function openEditorDeleteDialog(
	page: import("@playwright/test").Page,
	id: string,
) {
	await page.goto(`/blog/${id}`);
	await page.waitForLoadState("networkidle");
	await page.getByRole("button", { name: DELETE_BUTTON_NAME }).click();
	return page.getByRole("dialog", { name: DIALOG_NAME });
}

test.describe("Blog Delete", () => {
	// =========================================================================
	// AC1 — delete button visible for every status, both entry points
	// =========================================================================

	test.describe("Delete button visibility — all statuses (AC1)", () => {
		test("visible for every list row regardless of status", async ({
			page,
		}) => {
			await page.goto("/blog");
			await page.waitForLoadState("networkidle");

			const deleteButtons = page.getByRole("button", {
				name: DELETE_BUTTON_NAME,
			});
			await expect(deleteButtons).toHaveCount(blogPosts.length);
			for (let i = 0; i < blogPosts.length; i++) {
				await expect(deleteButtons.nth(i)).toBeVisible();
			}
		});

		const editorStatusCases = ["draft", "published", "archived"] as const;

		for (const status of editorStatusCases) {
			test(`visible in the editor topbar for a ${status} post`, async ({
				page,
				network,
			}) => {
				network.use(
					http.get("*/api/protected/blog/:id", () =>
						HttpResponse.json({
							post: { ...fullBlogPost, status },
							media: [],
						}),
					),
				);

				await page.goto(`/blog/${fullBlogPost.id}`);
				await page.waitForLoadState("networkidle");

				await expect(
					page.getByRole("button", { name: DELETE_BUTTON_NAME }),
				).toBeVisible();
			});
		}
	});

	// =========================================================================
	// AC2 — confirm-modal copy branches on sitePrUrl presence
	// =========================================================================

	test.describe("Confirm-modal copy (AC2)", () => {
		test("list row — live/published-with-PR post shows the live-post copy", async ({
			page,
			network,
		}) => {
			network.use(blogScenarios.listWithLivePost());

			const dialog = await openListDeleteDialog(
				page,
				"Getting Started with Growth Tools",
			);
			await expect(dialog).toBeVisible();
			await expect(dialog.getByText(LIVE_COPY)).toBeVisible();
		});

		test("list row — draft/never-published post shows the default copy", async ({
			page,
		}) => {
			const dialog = await openListDeleteDialog(
				page,
				"Top 10 Social Media Tips for Developers",
			);
			await expect(dialog).toBeVisible();
			await expect(dialog.getByText(DEFAULT_COPY)).toBeVisible();
		});

		test("editor topbar — live/published-with-PR post shows the live-post copy", async ({
			page,
			network,
		}) => {
			network.use(blogScenarios.getWithPr());

			const dialog = await openEditorDeleteDialog(page, publishedBlogWithPr.id);
			await expect(dialog).toBeVisible();
			await expect(dialog.getByText(LIVE_COPY)).toBeVisible();
		});

		test("editor topbar — never-published post shows the default copy", async ({
			page,
			network,
		}) => {
			network.use(blogEndpoints.get[200]());

			const dialog = await openEditorDeleteDialog(page, fullBlogPost.id);
			await expect(dialog).toBeVisible();
			await expect(dialog.getByText(DEFAULT_COPY)).toBeVisible();
		});
	});

	// =========================================================================
	// AC5 (success paths) — plain success vs. success-with-site_delete_error
	// =========================================================================

	test.describe("Delete success — no site_delete_error", () => {
		test("list row: success banner, row removed", async ({ page, network }) => {
			network.use(blogEndpoints.delete[200]());

			const title = "Top 10 Social Media Tips for Developers";
			const dialog = await openListDeleteDialog(page, title);

			// MSW is stateless — simulate the backend's post-delete list state so
			// the row-removed assertion reflects the refetch a real delete triggers.
			network.use(
				http.get("*/api/protected/blogs", () =>
					HttpResponse.json(blogPosts.filter((p) => p.title !== title)),
				),
			);

			await dialog.getByRole("button", { name: /^delete$/i }).click();
			await page.waitForLoadState("networkidle");

			const banner = page.getByRole("alert");
			await expect(banner).toBeVisible();
			await expect(banner).toContainText(/deleted/i);
			await expect(banner).not.toContainText(SITE_ERROR_BANNER);
			await expect(page.getByText(title)).not.toBeVisible();
		});

		test("editor topbar: success banner, navigates back to /blog", async ({
			page,
			network,
		}) => {
			network.use(blogEndpoints.get[200]());
			network.use(blogEndpoints.delete[200]());

			const dialog = await openEditorDeleteDialog(page, fullBlogPost.id);
			await dialog.getByRole("button", { name: /^delete$/i }).click();
			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL(/\/blog$/);
			const banner = page.getByRole("alert");
			await expect(banner).toBeVisible();
			await expect(banner).toContainText(/deleted/i);
			await expect(banner).not.toContainText(SITE_ERROR_BANNER);
		});
	});

	test.describe("Delete success — with site_delete_error (AC5)", () => {
		test("list row: warning banner with error text, dismissible", async ({
			page,
			network,
		}) => {
			network.use(blogScenarios.deleteWithSiteError());

			const dialog = await openListDeleteDialog(
				page,
				"Getting Started with Growth Tools",
			);
			await dialog.getByRole("button", { name: /^delete$/i }).click();
			await page.waitForLoadState("networkidle");

			const banner = page.getByRole("alert");
			await expect(banner).toBeVisible();
			await expect(banner).toContainText(SITE_ERROR_BANNER);
			await expect(banner).toContainText(/GitHub delete failed: rate limited/i);

			await banner.getByRole("button", { name: DISMISS_BUTTON_NAME }).click();
			await expect(banner).not.toBeVisible();
		});

		test("editor topbar: warning banner survives the post-delete navigation", async ({
			page,
			network,
		}) => {
			network.use(blogEndpoints.get[200]());
			network.use(blogScenarios.deleteWithSiteError());

			const dialog = await openEditorDeleteDialog(page, fullBlogPost.id);
			await dialog.getByRole("button", { name: /^delete$/i }).click();
			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL(/\/blog$/);
			const banner = page.getByRole("alert");
			await expect(banner).toBeVisible();
			await expect(banner).toContainText(SITE_ERROR_BANNER);
			await expect(banner).toContainText(/GitHub delete failed: rate limited/i);
		});
	});

	// =========================================================================
	// 404 / 500 / transport failure — both entry points
	// =========================================================================

	const deleteFailureCases = [
		{ status: 404, body: { error: "Blog post not found", code: "NOT_FOUND" } },
		{
			status: 500,
			body: { error: "An internal error occurred.", code: "INTERNAL_ERROR" },
		},
	] as const;

	test.describe("Delete failure — list row", () => {
		for (const tc of deleteFailureCases) {
			test(`handles ${tc.status}`, async ({ page, network }) => {
				network.use(
					http.delete("*/api/protected/blog/:id", () =>
						HttpResponse.json(tc.body, { status: tc.status }),
					),
				);

				const title = "Top 10 Social Media Tips for Developers";
				const dialog = await openListDeleteDialog(page, title);
				await dialog.getByRole("button", { name: /^delete$/i }).click();
				await page.waitForLoadState("networkidle");

				await expect(page.getByRole("alert")).toContainText(
					/couldn't delete blog post/i,
				);
				await expect(page.getByText(title)).toBeVisible();
			});
		}

		test("handles transport failure", async ({ page, network }) => {
			network.use(
				http.delete("*/api/protected/blog/:id", () => HttpResponse.error()),
			);

			const title = "Top 10 Social Media Tips for Developers";
			const dialog = await openListDeleteDialog(page, title);
			await dialog.getByRole("button", { name: /^delete$/i }).click();
			await page.waitForLoadState("networkidle");

			await expect(page.getByRole("alert")).toContainText(
				/couldn't delete blog post/i,
			);
			await expect(page.getByText(title)).toBeVisible();
		});
	});

	test.describe("Delete failure — editor topbar", () => {
		for (const tc of deleteFailureCases) {
			test(`handles ${tc.status}`, async ({ page, network }) => {
				network.use(blogEndpoints.get[200]());
				network.use(
					http.delete("*/api/protected/blog/:id", () =>
						HttpResponse.json(tc.body, { status: tc.status }),
					),
				);

				const dialog = await openEditorDeleteDialog(page, fullBlogPost.id);
				await dialog.getByRole("button", { name: /^delete$/i }).click();
				await page.waitForLoadState("networkidle");

				await expect(page).toHaveURL(new RegExp(`/blog/${fullBlogPost.id}$`));
				await expect(page.getByRole("alert")).toContainText(
					/couldn't delete blog post/i,
				);
			});
		}

		test("handles transport failure", async ({ page, network }) => {
			network.use(blogEndpoints.get[200]());
			network.use(
				http.delete("*/api/protected/blog/:id", () => HttpResponse.error()),
			);

			const dialog = await openEditorDeleteDialog(page, fullBlogPost.id);
			await dialog.getByRole("button", { name: /^delete$/i }).click();
			await page.waitForLoadState("networkidle");

			await expect(page).toHaveURL(new RegExp(`/blog/${fullBlogPost.id}$`));
			await expect(page.getByRole("alert")).toContainText(
				/couldn't delete blog post/i,
			);
		});
	});
});
