/**
 * Blog — Featured Image Toggle E2E Tests
 *
 * Covers the per-tile "featured image" toggle in the blog media grid
 * (MediaUploadSection, the product-local MediaUpload built on quiet's
 * FileUpload; every locator below is unchanged by that rewrite). Each image tile can be marked as the
 * post's featured image (single-select); video tiles never render the
 * toggle. Split out of blog.spec.ts to keep spec files under the ~600-line
 * budget (see frontend-e2e-rules).
 *
 * Endpoints exercised (new request-body scenario coverage only — no new
 * status codes, see webapp/e2e/handlers/blog.handlers.ts for the full
 * status-code table):
 *   POST /api/protected/blog       → featured_image_id present/absent
 *   PUT  /api/protected/blog/:id   → featured_image_id present/absent
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { blogScenarios, fullBlogPost } from "./handlers/blog.handlers";
import { mediaItems } from "./mocks/data";

// Two images (media_1, media_3) + one video (media_2), none featured —
// covers the "≥2 images + 1 video" shape called for by the contract.
const mediaWithVideoUnfeatured = [mediaItems[0], mediaItems[2], mediaItems[1]];

function mockGetWithMedia(media: typeof mediaItems, featuredImageId?: string) {
	return http.get("*/api/protected/blog/:id", () =>
		HttpResponse.json({
			post: { ...fullBlogPost, featured_image_id: featuredImageId },
			media,
		}),
	);
}

test.describe("Blog — Featured image toggle", () => {
	test.describe("Editor — toggle interactions", () => {
		test.beforeEach(async ({ network, page }) => {
			network.use(mockGetWithMedia(mediaWithVideoUnfeatured));
			await page.goto(`/blog/${fullBlogPost.id}`);
			await page.waitForLoadState("networkidle");
		});

		test("clicking a tile's toggle marks it featured and un-marks the previously featured tile", async ({
			page,
		}) => {
			const media1Name = mediaItems[0].filename;
			const media3Name = mediaItems[2].filename;

			const setMedia1Featured = page.getByRole("button", {
				name: `Set ${media1Name} as featured image`,
			});
			await setMedia1Featured.click();

			await expect(
				page.getByRole("button", {
					name: `${media1Name} is the featured image`,
				}),
			).toBeVisible();

			const setMedia3Featured = page.getByRole("button", {
				name: `Set ${media3Name} as featured image`,
			});
			await setMedia3Featured.click();

			await expect(
				page.getByRole("button", {
					name: `${media3Name} is the featured image`,
				}),
			).toBeVisible();

			// The previous tile must revert to the unfeatured accessible name —
			// single-select, not additive.
			await expect(
				page.getByRole("button", {
					name: `Set ${media1Name} as featured image`,
				}),
			).toBeVisible();
			await expect(
				page.getByRole("button", {
					name: `${media1Name} is the featured image`,
				}),
			).not.toBeVisible();
		});

		test("clicking the already-featured tile's toggle un-marks it", async ({
			page,
		}) => {
			const media1Name = mediaItems[0].filename;

			await page
				.getByRole("button", { name: `Set ${media1Name} as featured image` })
				.click();
			await expect(
				page.getByRole("button", {
					name: `${media1Name} is the featured image`,
				}),
			).toBeVisible();

			// Toggle off.
			await page
				.getByRole("button", {
					name: `${media1Name} is the featured image`,
				})
				.click();

			await expect(
				page.getByRole("button", {
					name: `Set ${media1Name} as featured image`,
				}),
			).toBeVisible();
			await expect(
				page.getByRole("button", {
					name: `${media1Name} is the featured image`,
				}),
			).not.toBeVisible();
		});

		test("removing the currently-featured attachment clears the featured state", async ({
			page,
		}) => {
			const media1Name = mediaItems[0].filename;

			await page
				.getByRole("button", { name: `Set ${media1Name} as featured image` })
				.click();
			await expect(
				page.getByRole("button", {
					name: `${media1Name} is the featured image`,
				}),
			).toBeVisible();

			await page.getByRole("button", { name: `Remove ${media1Name}` }).click();

			// No remaining tile in the grid should report itself as featured.
			await expect(
				page.getByRole("button", { name: /is the featured image/i }),
			).toHaveCount(0);
		});

		test("video tiles never render a featured toggle button", async ({
			page,
		}) => {
			const videoName = mediaItems[1].filename;

			// The video's own remove button exists (tile is rendered)...
			await expect(
				page.getByRole("button", { name: `Remove ${videoName}` }),
			).toBeVisible();

			// ...but neither featured-toggle accessible name targets it.
			await expect(
				page.getByRole("button", {
					name: `Set ${videoName} as featured image`,
				}),
			).toHaveCount(0);
			await expect(
				page.getByRole("button", {
					name: `${videoName} is the featured image`,
				}),
			).toHaveCount(0);
		});
	});

	test.describe("Editor — hydration from initialBlogPost", () => {
		test("post with an existing featured_image_id renders that tile as featured on load", async ({
			network,
			page,
		}) => {
			network.use(blogScenarios.getWithFeaturedImage());

			await page.goto(`/blog/${fullBlogPost.id}`);
			await page.waitForLoadState("networkidle");

			const media1Name = mediaItems[0].filename;

			// Featured on load, without any click.
			await expect(
				page.getByRole("button", {
					name: `${media1Name} is the featured image`,
				}),
			).toBeVisible();
		});
	});

	test.describe("Save — featured_image_id on request body", () => {
		// Only "Save draft" is exercised below (not "Publish") — both buttons
		// funnel through the same request-body-building code path, so a second
		// Publish-flavored test would assert the identical wiring without added
		// coverage value.

		test("save with a featured image selected sends featured_image_id matching the selected tile", async ({
			network,
			page,
		}) => {
			network.use(mockGetWithMedia(mediaWithVideoUnfeatured));

			let sentBody: Record<string, unknown> | undefined;
			network.use(
				http.put("*/api/protected/blog/:id", async ({ request }) => {
					sentBody = (await request.json()) as Record<string, unknown>;
					return HttpResponse.json({ post: fullBlogPost, media: [] });
				}),
			);

			await page.goto(`/blog/${fullBlogPost.id}`);
			await page.waitForLoadState("networkidle");

			const media1Name = mediaItems[0].filename;
			await page
				.getByRole("button", { name: `Set ${media1Name} as featured image` })
				.click();

			await page.getByRole("button", { name: /save draft/i }).click();
			await page.waitForLoadState("networkidle");

			expect(sentBody?.featured_image_id).toBe(mediaItems[0].id);
		});

		test("save with no featured image selected omits featured_image_id (regression: nothing sends it today)", async ({
			network,
			page,
		}) => {
			network.use(mockGetWithMedia(mediaWithVideoUnfeatured));

			let sentBody: Record<string, unknown> | undefined;
			network.use(
				http.put("*/api/protected/blog/:id", async ({ request }) => {
					sentBody = (await request.json()) as Record<string, unknown>;
					return HttpResponse.json({ post: fullBlogPost, media: [] });
				}),
			);

			await page.goto(`/blog/${fullBlogPost.id}`);
			await page.waitForLoadState("networkidle");

			await page.getByRole("button", { name: /save draft/i }).click();
			await page.waitForLoadState("networkidle");

			expect(sentBody?.featured_image_id).toBeUndefined();
		});
	});
});
