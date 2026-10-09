/**
 * Post composer (wizard) E2E Tests
 *
 * The create (/posts/new) and edit (/posts/:id) composer. Every action reports
 * through a toast, except feedback raised while a Dialog or Drawer is open:
 * that renders inline inside it, because a Dialog/Drawer makes the Toaster
 * inert.
 *
 * Endpoints exercised (each table-driven over 200/400/401/403/404/409/500/503
 * and a transport failure):
 *   POST /api/protected/posts/draft          save draft (create mode)
 *   PUT  /api/protected/posts/:id/draft      update draft (edit mode)
 *   POST /api/protected/posts/:id/publish    publish
 *   POST /api/protected/posts/:id/schedule   schedule
 *   POST /api/protected/posts/:id/retry      retry failed platforms
 *   DELETE /api/protected/posts/:id          delete (inline dialog alert)
 *   POST /api/protected/content/generate/stream  SSE generation (create mode)
 *
 * The 375px viewport is used for the action tests so the MobileActionBar's
 * contracted aria-labels ("Publish post", "Save draft", ...) are the locators.
 */
import type { NetworkFixture } from "@msw/playwright";
import type { Page } from "@playwright/test";
import { HttpResponse, http } from "msw";
import type { ApiPlatformPost, ApiPost } from "../src/api/types/post";
import { expect, test } from "./fixtures/test";
import { postsEndpoints } from "./handlers/posts.handlers";
import type { StatusKey } from "./helpers/endpoint";
import { toastLocator } from "./helpers/toast";
import { posts } from "./mocks/data";

const STATUSES: StatusKey[] = [
	200,
	400,
	401,
	403,
	404,
	409,
	500,
	503,
	"transport",
];

// Fixed instants: a past one the schedule validation must reject, and one far
// enough ahead that it is always valid regardless of when the suite runs.
const PAST_ISO = "2020-01-15T10:00:00.000Z";
const FUTURE_ISO = new Date(Date.now() + 2 * 86_400_000).toISOString();

const draft: ApiPost = { ...posts[1], content_type: "text" };

function platformPost(
	status: ApiPlatformPost["status"],
	overrides: Partial<ApiPlatformPost> = {},
): ApiPlatformPost {
	return {
		id: "pp_x",
		post_id: draft.id,
		platform: "x",
		status,
		content: "Shipping the new composer today.",
		engagement: {},
		attempt_count: status === "failed" ? 3 : 0,
		max_attempts: 3,
		created_at: draft.created_at,
		updated_at: draft.updated_at,
		...overrides,
	};
}

function mockDetails(
	network: NetworkFixture,
	post: ApiPost,
	platformPosts: ApiPlatformPost[],
) {
	network.use(
		http.get("*/api/protected/posts/:id/details", () =>
			HttpResponse.json({
				post,
				platform_posts: platformPosts,
				media: null,
			}),
		),
	);
}

async function openEdit(page: Page) {
	await page.goto(`/posts/${draft.id}`);
	await page.waitForLoadState("networkidle");
}

function actionBar(page: Page) {
	return page.getByRole("toolbar", { name: /post actions/i });
}

// Create mode: Save draft / Publish are disabled until content is generated.
async function generateOnNew(page: Page) {
	await page.goto("/posts/new");
	await page
		.getByLabel("Idea or Instructions for post")
		.fill("Shipping the composer");
	await page.getByRole("switch", { name: "X (Twitter)" }).click();
	await page.getByRole("button", { name: "Generate Content" }).click();
	await expect(
		actionBar(page).getByRole("button", { name: "Publish post" }),
	).toBeEnabled();
}

function describeStatus(status: StatusKey) {
	return status === "transport" ? "transport failure" : String(status);
}

test.describe("Post composer — actions", () => {
	test.use({ viewport: { width: 375, height: 812 } });

	// ── Publish ──────────────────────────────────────────────────────────────

	test.describe("POST /posts/:id/publish", () => {
		for (const status of STATUSES) {
			test(`publish handles ${describeStatus(status)}`, async ({
				network,
				page,
			}) => {
				mockDetails(network, draft, [platformPost("pending")]);
				network.use(postsEndpoints.publish[status]());
				await openEdit(page);

				await actionBar(page)
					.getByRole("button", { name: "Publish post" })
					.click();

				if (status === 200) {
					await expect(
						toastLocator(page, "status", "Post published"),
					).toBeVisible();
					await expect(page).toHaveURL(/\/posts\/?$/);
				} else {
					await expect(
						toastLocator(page, "alert", "Couldn't publish post"),
					).toBeVisible();
					await expect(page).toHaveURL(new RegExp(`/posts/${draft.id}$`));
				}
			});
		}
	});

	// ── Save draft (create mode: POST /posts/draft) ──────────────────────────

	test.describe("POST /posts/draft", () => {
		for (const status of STATUSES) {
			test(`save draft handles ${describeStatus(status)}`, async ({
				network,
				page,
			}) => {
				network.use(postsEndpoints.saveDraft[status]());
				await generateOnNew(page);

				await actionBar(page)
					.getByRole("button", { name: "Save draft" })
					.click();

				if (status === 200) {
					await expect(
						toastLocator(page, "status", "Draft saved"),
					).toBeVisible();
					await expect(page).toHaveURL(/\/posts\/?$/);
				} else {
					await expect(
						toastLocator(page, "alert", "Couldn't save draft"),
					).toBeVisible();
					await expect(page).toHaveURL(/\/posts\/new$/);
				}
			});
		}
	});

	// ── Update draft (edit mode: PUT /posts/:id/draft) ───────────────────────

	test.describe("PUT /posts/:id/draft", () => {
		for (const status of STATUSES) {
			test(`update draft handles ${describeStatus(status)}`, async ({
				network,
				page,
			}) => {
				mockDetails(network, draft, [platformPost("pending")]);
				network.use(postsEndpoints.updateDraft[status]());
				await openEdit(page);

				await actionBar(page)
					.getByRole("button", { name: "Save draft" })
					.click();

				if (status === 200) {
					await expect(
						toastLocator(page, "status", "Draft updated"),
					).toBeVisible();
				} else {
					await expect(
						toastLocator(page, "alert", "Couldn't save draft"),
					).toBeVisible();
				}
			});
		}

		test("a failed update stops publish before the publish request", async ({
			network,
			page,
		}) => {
			mockDetails(network, draft, [platformPost("pending")]);
			let publishCalls = 0;
			network.use(
				postsEndpoints.updateDraft[500](),
				http.post("*/api/protected/posts/:id/publish", () => {
					publishCalls += 1;
					return HttpResponse.json({});
				}),
			);
			await openEdit(page);

			await actionBar(page)
				.getByRole("button", { name: "Publish post" })
				.click();

			await expect(
				toastLocator(page, "alert", "Couldn't publish post"),
			).toBeVisible();
			expect(publishCalls).toBe(0);
		});
	});

	// ── Schedule Drawer ──────────────────────────────────────────────────────

	test.describe("Schedule Drawer", () => {
		async function openDrawer(page: Page) {
			await actionBar(page)
				.getByRole("button", { name: "Schedule post" })
				.click();
			return page.getByRole("dialog", { name: /schedule post/i });
		}

		test("opens with a Time field", async ({ network, page }) => {
			mockDetails(network, { ...draft, scheduled_at: FUTURE_ISO }, [
				platformPost("pending"),
			]);
			await openEdit(page);

			const drawer = await openDrawer(page);
			await expect(drawer).toBeVisible();
			await expect(drawer.getByLabel("Time")).toBeVisible();
		});

		test("a past time shows the error inline, not as a toast", async ({
			network,
			page,
		}) => {
			mockDetails(network, { ...draft, scheduled_at: PAST_ISO }, [
				platformPost("pending"),
			]);
			let scheduleCalls = 0;
			network.use(
				http.post("*/api/protected/posts/:id/schedule", () => {
					scheduleCalls += 1;
					return HttpResponse.json({});
				}),
			);
			await openEdit(page);

			const drawer = await openDrawer(page);
			await drawer
				.getByRole("button", { name: "Schedule", exact: true })
				.click();

			await expect(drawer.getByRole("alert")).toContainText(
				"Pick a time in the future",
			);
			await expect(drawer).toBeVisible();
			await expect(toastLocator(page, "alert")).toHaveCount(0);
			expect(scheduleCalls).toBe(0);
		});

		test("the inline error clears when the time changes", async ({
			network,
			page,
		}) => {
			mockDetails(network, { ...draft, scheduled_at: PAST_ISO }, [
				platformPost("pending"),
			]);
			await openEdit(page);

			const drawer = await openDrawer(page);
			await drawer
				.getByRole("button", { name: "Schedule", exact: true })
				.click();
			await expect(drawer.getByRole("alert")).toBeVisible();

			await drawer.getByLabel("Time").fill("23:59");
			await expect(drawer.getByRole("alert")).toHaveCount(0);
		});

		test("the inline error clears when the drawer is closed", async ({
			network,
			page,
		}) => {
			mockDetails(network, { ...draft, scheduled_at: PAST_ISO }, [
				platformPost("pending"),
			]);
			await openEdit(page);

			const drawer = await openDrawer(page);
			await drawer
				.getByRole("button", { name: "Schedule", exact: true })
				.click();
			await expect(drawer.getByRole("alert")).toBeVisible();

			await drawer.getByRole("button", { name: "Cancel" }).click();
			await expect(drawer).not.toBeVisible();

			const reopened = await openDrawer(page);
			await expect(reopened.getByRole("alert")).toHaveCount(0);
		});

		for (const status of STATUSES) {
			test(`schedule handles ${describeStatus(status)}`, async ({
				network,
				page,
			}) => {
				mockDetails(network, { ...draft, scheduled_at: FUTURE_ISO }, [
					platformPost("pending"),
				]);
				network.use(postsEndpoints.schedule[status]());
				await openEdit(page);

				const drawer = await openDrawer(page);
				await drawer
					.getByRole("button", { name: "Schedule", exact: true })
					.click();

				// The drawer closes before the request runs, so the result is a toast.
				await expect(drawer).not.toBeVisible();
				if (status === 200) {
					await expect(
						toastLocator(page, "status", "Post scheduled"),
					).toBeVisible();
				} else {
					await expect(
						toastLocator(page, "alert", "Couldn't schedule post"),
					).toBeVisible();
				}
			});
		}
	});

	// ── Retry ────────────────────────────────────────────────────────────────

	test.describe("POST /posts/:id/retry", () => {
		const failed: ApiPost = { ...draft, status: "failed" };

		for (const status of STATUSES) {
			test(`retry handles ${describeStatus(status)}`, async ({
				network,
				page,
			}) => {
				mockDetails(network, failed, [
					platformPost("failed", { error_message: "rate limited" }),
				]);
				network.use(postsEndpoints.retry[status]());
				await openEdit(page);

				await page.getByRole("button", { name: /retry failed/i }).click();

				if (status === 200) {
					await expect(
						toastLocator(page, "status", "Retrying failed platforms"),
					).toBeVisible();
					await expect(page).toHaveURL(/\/posts\/?$/);
				} else {
					await expect(
						toastLocator(page, "alert", "Couldn't retry post"),
					).toBeVisible();
				}
			});
		}
	});

	// ── Delete (dialog: failure is inline, success is a toast) ───────────────

	test.describe("DELETE /posts/:id via the Delete post dialog", () => {
		async function openDeleteDialog(page: Page) {
			await actionBar(page)
				.getByRole("button", { name: "Delete post" })
				.click();
			const dialog = page.getByRole("dialog", { name: /delete post/i });
			await expect(dialog).toBeVisible();
			return dialog;
		}

		for (const status of STATUSES) {
			test(`delete handles ${describeStatus(status)}`, async ({
				network,
				page,
			}) => {
				mockDetails(network, draft, [platformPost("pending")]);
				network.use(postsEndpoints.delete[status]());
				await openEdit(page);

				const dialog = await openDeleteDialog(page);
				await dialog.getByRole("button", { name: /^delete$/i }).click();

				if (status === 200) {
					await expect(
						toastLocator(page, "status", "Post deleted"),
					).toBeVisible();
					await expect(dialog).not.toBeVisible();
					await expect(page).toHaveURL(/\/posts\/?$/);
				} else {
					await expect(dialog.getByRole("alert")).toContainText(
						"Couldn't delete post",
					);
					await expect(dialog).toBeVisible();
					await expect(toastLocator(page, "alert")).toHaveCount(0);
				}
			});
		}

		test("Cancel closes the dialog without a delete request", async ({
			network,
			page,
		}) => {
			mockDetails(network, draft, [platformPost("pending")]);
			let deleteCalls = 0;
			network.use(
				http.delete("*/api/protected/posts/:id", () => {
					deleteCalls += 1;
					return HttpResponse.json({ message: "Post deleted" });
				}),
			);
			await openEdit(page);

			const dialog = await openDeleteDialog(page);
			await dialog.getByRole("button", { name: "Cancel" }).click();

			await expect(dialog).not.toBeVisible();
			expect(deleteCalls).toBe(0);
		});
	});
});

test.describe("Post composer — compose and preview", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("selected platforms get a 'Platform previews' tablist", async ({
		network,
		page,
	}) => {
		mockDetails(network, draft, [platformPost("pending")]);
		await openEdit(page);

		const tablist = page.getByRole("tablist", { name: "Platform previews" });
		await expect(tablist).toBeVisible();
		await expect(
			tablist.getByRole("tab", { name: "X (Twitter)" }),
		).toHaveAttribute("aria-selected", "true");
	});

	test("Thread mode switch reveals the Thread length stepper", async ({
		network,
		page,
	}) => {
		mockDetails(network, draft, [platformPost("pending")]);
		await openEdit(page);

		const threadMode = page.getByRole("switch", { name: "Thread mode" });
		await expect(threadMode).not.toBeChecked();

		await threadMode.click();
		await expect(threadMode).toBeChecked();

		const length = page.getByRole("spinbutton", { name: "Thread length" });
		await expect(length).toBeVisible();
		await expect(length).toHaveAttribute("aria-valuemin", "3");
		await expect(length).toHaveAttribute("aria-valuemax", "25");
	});

	test("generating on /posts/new streams content into the preview", async ({
		network,
		page,
	}) => {
		network.use(postsEndpoints.generateStream[200]());
		await generateOnNew(page);

		await expect(
			page.getByRole("tablist", { name: "Platform previews" }),
		).toBeVisible();
	});

	test("an SSE start failure shows the inline error and no preview", async ({
		network,
		page,
	}) => {
		network.use(postsEndpoints.generateStream[500]());
		await page.goto("/posts/new");
		await page
			.getByLabel("Idea or Instructions for post")
			.fill("Shipping the composer");
		await page.getByRole("switch", { name: "X (Twitter)" }).click();
		await page.getByRole("button", { name: "Generate Content" }).click();

		await expect(
			page.getByRole("alert").filter({
				hasText: "Failed to start content generation",
			}),
		).toBeVisible();
		await expect(
			page.getByRole("tablist", { name: "Platform previews" }),
		).toHaveCount(0);
	});
});
