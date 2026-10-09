/**
 * Media upload E2E Tests
 *
 * The product-local MediaUpload (quiet FileUpload) as used by /blog/new and
 * /posts/new through MediaUploadSection.
 *
 * Endpoint: POST /api/protected/media. Every status in mediaEndpoints.upload
 * is table-driven below.
 */
import { expect, test } from "./fixtures/test";
import { mediaEndpoints, mediaScenarios } from "./handlers/media.handlers";

const routes = [
	{ path: "/blog/new", featured: true },
	{ path: "/posts/new", featured: false },
] as const;

const UPLOADED = "uploaded-file.png";

const png = {
	name: "photo.png",
	mimeType: "image/png",
	buffer: Buffer.from("fake-image"),
};

// useUploadMedia maps the response status to a fixed user-facing message (the
// raw response body is never shown), so each status asserts its own exact copy.
// A transport failure (no response) gets the connectivity message. 413 is not
// covered because the shared endpoint helper has no 413 case.
const errorCases = [
	{
		status: 400,
		text: "This file couldn't be uploaded. Check its type and size.",
	},
	{
		status: 401,
		text: "Your session expired. Sign in again to upload.",
	},
	{
		status: 403,
		text: "You don't have permission to upload media.",
	},
	{
		status: 404,
		text: "Upload isn't available right now. Try again later.",
	},
	{
		status: 409,
		text: "This file has already been uploaded.",
	},
	{ status: 500, text: "Upload failed. Try again." },
	{ status: 503, text: "Upload failed. Try again." },
	{
		status: "transport",
		text: "Couldn't reach the server. Check your connection and try again.",
	},
] as const;

for (const route of routes) {
	test.describe(`Media upload — ${route.path}`, () => {
		test.beforeEach(async ({ page }) => {
			await page.goto(route.path);
		});

		test("renders the Media region and the dropzone button", async ({
			page,
		}) => {
			const region = page.getByRole("region", { name: "Media", exact: true });
			await expect(region).toBeVisible();
			await expect(
				region.getByRole("heading", { level: 2, name: "Media" }),
			).toBeVisible();
			await expect(
				region.getByRole("button", { name: "Choose files or drop them here" }),
			).toBeVisible();
		});

		test("POST /media 201 replaces the pending row with an attached tile", async ({
			network,
			page,
		}) => {
			network.use(mediaEndpoints.upload[200]());
			await page.locator('input[type="file"]').setInputFiles(png);

			const attached = page.getByRole("region", { name: "Attached media" });
			await expect(
				attached.getByRole("button", { name: `Remove ${UPLOADED}` }),
			).toBeVisible();
			await expect(attached.getByRole("img", { name: UPLOADED })).toBeVisible();
			await expect(
				page.getByRole("progressbar", { name: "Uploading photo.png" }),
			).toHaveCount(0);
			await expect(
				page.getByRole("button", { name: "Remove photo.png" }),
			).toHaveCount(0);

			const featureToggle = attached.getByRole("button", {
				name: `Set ${UPLOADED} as featured image`,
			});
			if (route.featured) {
				await expect(featureToggle).toBeVisible();
			} else {
				await expect(featureToggle).toHaveCount(0);
			}
		});

		for (const tc of errorCases) {
			test(`POST /media ${tc.status} shows the error on the pending row and attaches nothing`, async ({
				network,
				page,
			}) => {
				network.use(mediaEndpoints.upload[tc.status]());
				await page.locator('input[type="file"]').setInputFiles(png);

				const remove = page.getByRole("button", { name: "Remove photo.png" });
				await expect(remove).toBeVisible();
				await expect(page.getByText(tc.text, { exact: true })).toBeVisible();
				await expect(page.getByRole("alert")).toHaveCount(0);
				await expect(
					page.getByRole("region", { name: "Attached media" }),
				).toHaveCount(0);

				await remove.click();
				await expect(remove).toHaveCount(0);
				await expect(page.getByText(tc.text, { exact: true })).toHaveCount(0);
			});
		}

		test("a file of the wrong type shows 'Type not accepted' and makes no request", async ({
			page,
		}) => {
			let requests = 0;
			page.on("request", (request) => {
				if (
					request.method() === "POST" &&
					new URL(request.url()).pathname === "/api/protected/media"
				) {
					requests += 1;
				}
			});

			await page.locator('input[type="file"]').setInputFiles({
				name: "notes.txt",
				mimeType: "text/plain",
				buffer: Buffer.from("hello"),
			});

			await expect(page.getByText("Type not accepted")).toBeVisible();
			await page.waitForLoadState("networkidle");
			expect(requests).toBe(0);
		});
	});
}

test.describe("Media upload — Generate Content gating on /posts/new", () => {
	test("Generate Content stays disabled while an upload is in flight", async ({
		network,
		page,
	}) => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		network.use(mediaScenarios.uploadSlow(gate));

		await page.goto("/posts/new");
		await page
			.getByLabel("Idea or Instructions for post")
			.fill("Shipping the new upload flow");
		const xSwitch = page.getByRole("switch", { name: "X (Twitter)" });
		await xSwitch.click();
		await expect(xSwitch).toBeChecked();

		const generate = page.getByRole("button", { name: "Generate Content" });
		await expect(generate).toBeEnabled();

		await page.locator('input[type="file"]').setInputFiles(png);
		await expect(
			page.getByRole("progressbar", { name: "Uploading photo.png" }),
		).toBeVisible();
		await expect(generate).toBeDisabled();

		release();
		await expect(
			page.getByRole("progressbar", { name: "Uploading photo.png" }),
		).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: `Remove ${UPLOADED}` }),
		).toBeVisible();
		await expect(generate).toBeEnabled();
	});
});
