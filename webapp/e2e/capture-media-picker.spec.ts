/**
 * Captured media picker E2E Tests
 *
 * Commit-generated drafts expose every capture artifact as `capture_media` on
 * GET /posts/:id/details. The editor lists them with checkboxes (ticked =
 * publishes with the post) and can regenerate the post copy around the
 * ticked set.
 *
 * Endpoints exercised:
 *   GET  /api/protected/posts/:id/details     → capture_media present / absent
 *   POST /api/protected/posts/:id/regenerate  → 200, 400, 401, 404, 409, 500
 */
import type { NetworkFixture } from "@msw/playwright";
import { HttpResponse, http } from "msw";
import type { ApiMediaItem } from "../src/api/types/media";
import { expect, test } from "./fixtures/test";
import { postsEndpoints } from "./handlers/posts.handlers";
import { posts } from "./mocks/data";

const draft = posts[1];

function captureItem(
	id: string,
	group: "storybook" | "demo",
	filename: string,
	contentType: string,
): ApiMediaItem {
	return {
		id,
		account_id: draft.account_id,
		filename,
		content_type: contentType,
		s3_url: `https://cdn.example.com/captures/abc123/${group}/${filename}`,
		size_bytes: 1024,
		source: "github_capture",
		created_at: draft.created_at,
		updated_at: draft.updated_at,
	};
}

const recording = captureItem(
	"cap_video",
	"demo",
	"recording.mp4",
	"video/mp4",
);
const badgeDefault = captureItem(
	"cap_badge_default",
	"storybook",
	"Badge--primitives-badge--default.png",
	"image/png",
);
const badgePrimary = captureItem(
	"cap_badge_primary",
	"storybook",
	"Badge--primitives-badge--primary.png",
	"image/png",
);
const captureMedia = [recording, badgeDefault, badgePrimary];

function mockDetails(
	network: NetworkFixture,
	opts: { media: ApiMediaItem[]; capture: ApiMediaItem[] | null },
) {
	network.use(
		http.get("*/api/protected/posts/:id/details", () =>
			HttpResponse.json({
				post: { ...draft, media_ids: opts.media.map((m) => m.id) },
				platform_posts: [],
				media: opts.media,
				capture_media: opts.capture,
			}),
		),
	);
}

async function openDraft(page: import("@playwright/test").Page) {
	await page.goto(`/posts/${draft.id}`);
	await page.waitForLoadState("networkidle");
}

test.describe("Captured media picker", () => {
	test("is hidden for posts without captures", async ({ network, page }) => {
		mockDetails(network, { media: [], capture: null });
		await openDraft(page);
		await expect(
			page.getByRole("heading", { name: "Captured media" }),
		).toHaveCount(0);
		await expect(
			page.getByRole("region", { name: "Captured media" }),
		).toHaveCount(0);
	});

	test("lists every capture, grouped, with the AI pick ticked", async ({
		network,
		page,
	}) => {
		mockDetails(network, { media: [badgeDefault], capture: captureMedia });
		await openDraft(page);

		const picker = page.getByRole("region", { name: "Captured media" });
		await expect(picker).toBeVisible();
		await expect(picker.getByText("Storybook · 2")).toBeVisible();
		await expect(picker.getByText("Demo · 1")).toBeVisible();
		await expect(
			picker.getByRole("checkbox", { name: "Use Badge · default" }),
		).toBeChecked();
		await expect(
			picker.getByRole("checkbox", { name: "Use Badge · primary" }),
		).not.toBeChecked();
		await expect(
			picker.getByRole("checkbox", { name: "Use Recording" }),
		).not.toBeChecked();
		await expect(
			picker.getByRole("button", { name: "Regenerate with 1 selected" }),
		).toBeEnabled();
	});

	test("warns when a video is mixed with images", async ({ network, page }) => {
		mockDetails(network, { media: [badgeDefault], capture: captureMedia });
		await openDraft(page);

		const picker = page.getByRole("region", { name: "Captured media" });
		await picker.getByRole("checkbox", { name: "Use Recording" }).check();
		await expect(
			picker.getByText(/can't post a video together/i),
		).toBeVisible();

		await picker.getByRole("checkbox", { name: "Use Recording" }).uncheck();
		await expect(picker.getByText(/can't post a video together/i)).toHaveCount(
			0,
		);
	});

	test("unticking a persisted capture unlinks it from the post", async ({
		network,
		page,
	}) => {
		mockDetails(network, { media: [badgeDefault], capture: captureMedia });
		let unlinked: string | undefined;
		network.use(
			http.delete("*/api/protected/posts/:id/media/:mediaID", ({ params }) => {
				unlinked = String(params.mediaID);
				return HttpResponse.json({ message: "Media unlinked from post" });
			}),
		);
		await openDraft(page);

		const picker = page.getByRole("region", { name: "Captured media" });
		await picker
			.getByRole("checkbox", { name: "Use Badge · default" })
			.uncheck();
		await expect.poll(() => unlinked).toBe(badgeDefault.id);
		await expect(
			picker.getByRole("button", { name: "Regenerate with 0 selected" }),
		).toBeDisabled();
	});

	test("regenerate sends the ticked captures in order and reloads the draft", async ({
		network,
		page,
	}) => {
		mockDetails(network, { media: [badgeDefault], capture: captureMedia });
		let sentBody: Record<string, unknown> | undefined;
		network.use(
			http.post("*/api/protected/posts/:id/regenerate", async ({ request }) => {
				sentBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(draft);
			}),
		);
		await openDraft(page);

		const picker = page.getByRole("region", { name: "Captured media" });
		await picker.getByRole("checkbox", { name: "Use Badge · primary" }).check();
		const detailsReload = page.waitForRequest((req) =>
			req.url().includes(`/posts/${draft.id}/details`),
		);
		await picker
			.getByRole("button", { name: "Regenerate with 2 selected" })
			.click();

		await expect
			.poll(() => sentBody)
			.toEqual({
				media_ids: [badgeDefault.id, badgePrimary.id],
			});
		await detailsReload;
		await expect(
			page.getByText("Post regenerated with your selected media"),
		).toBeVisible();
	});

	const regenerateErrorCases = [
		{ status: 400, expect: /not one of this post's captures/i },
		{ status: 401, expect: /unauthorized/i },
		{ status: 404, expect: /not found/i },
		{ status: 409, expect: /only draft posts can be regenerated/i },
		{ status: 500, expect: /internal error|try again/i },
	] as const;

	for (const c of regenerateErrorCases) {
		test(`regenerate ${c.status} surfaces the error`, async ({
			network,
			page,
		}) => {
			mockDetails(network, { media: [badgeDefault], capture: captureMedia });
			network.use(postsEndpoints.regenerate[c.status]());
			await openDraft(page);

			await page
				.getByRole("region", { name: "Captured media" })
				.getByRole("button", { name: "Regenerate with 1 selected" })
				.click();
			await expect(
				page.getByRole("alert").filter({ hasText: c.expect }),
			).toBeVisible();
		});
	}
});
