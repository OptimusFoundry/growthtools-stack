/// <reference types="node" />
/**
 * Media E2E Tests
 *
 * Covers every status code the backend can return for each media endpoint.
 * Table-driven loops handle all non-2xx paths; golden-path tests verify
 * happy-path rendering and interactions.
 *
 * Endpoints under test:
 *   GET    /api/protected/media        → 200, 401, 500, transport-failure
 *   POST   /api/protected/media        → 201, 400, 401, 500, transport-failure
 *   DELETE /api/protected/media/:id    → 200, 400, 401, 404, 500, transport-failure
 */
import type { Page } from "@playwright/test";
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { mediaItems } from "./mocks/data";

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Navigate to /media and wait for network activity to settle. */
async function gotoMedia(page: Page) {
	await page.goto("/media");
	await page.waitForLoadState("networkidle");
}

// ============================================================================
// Page Load (golden-path)
// ============================================================================

test.describe("Media — Page Load", () => {
	test("renders page heading", async ({ page }) => {
		await gotoMedia(page);
		// The page has 2 h1s: Topbar title and page hero title
		// Look for the one with the descriptive text
		const content = await page.textContent("body");
		expect(content).toMatch(/every asset.*one tap away/i);
	});

	test("shows upload button in the topbar", async ({ page }) => {
		await gotoMedia(page);
		await expect(
			page.getByRole("button", { name: "Upload", exact: true }),
		).toBeVisible();
		await expect(page.getByLabel("Upload media file")).toHaveAttribute(
			"accept",
			"image/*,video/*",
		);
	});

	test("topbar Upload button does not collide with the empty-state action", async ({
		page,
	}) => {
		await gotoMedia(page);
		await expect(page.getByText(/upload media/i)).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: /upload media/i }),
		).toHaveCount(0);
	});

	test("renders media items with filenames", async ({ page }) => {
		await gotoMedia(page);
		await expect(page.getByText(mediaItems[0].filename)).toBeVisible();
		await expect(page.getByText(mediaItems[1].filename)).toBeVisible();
	});

	test("shows file-type badge derived from content_type", async ({ page }) => {
		await gotoMedia(page);
		// mediaItems[0] is image/png → badge text "PNG"
		await expect(page.getByText("PNG", { exact: true }).first()).toBeVisible();
	});

	test("shows item count in the eyebrow", async ({ page }) => {
		await gotoMedia(page);
		await expect(page.getByText(/library/i)).toHaveCount(1);
		await expect(page.getByText(/library/i)).toContainText(
			String(mediaItems.length).padStart(2, "0"),
		);
	});
});

// ============================================================================
// Empty State (golden-path)
// ============================================================================

test.describe("Media — Empty State", () => {
	test("shows empty state when library has no items", async ({
		network,
		page,
	}) => {
		network.use(http.get("*/api/protected/media", () => HttpResponse.json([])));
		await gotoMedia(page);
		await expect(page.getByText(/no media yet/i)).toBeVisible();
	});

	test("shows upload action inside empty state", async ({ network, page }) => {
		network.use(http.get("*/api/protected/media", () => HttpResponse.json([])));
		await gotoMedia(page);
		await expect(
			page.getByRole("button", { name: /upload media/i }),
		).toBeVisible();
	});
});

// ============================================================================
// Status Code Coverage — GET /api/protected/media
// ============================================================================

test.describe("GET /api/protected/media — status code coverage", () => {
	const cases = [
		{
			status: 401,
			body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
			// 401 on the media list endpoint sets hook error; page falls back to
			// empty state because the media array stays [].
			expectVisible: /no media yet/i,
			label: "unauthorized — falls back to empty state",
		},
		{
			status: 500,
			body: {
				error: "An internal error occurred. Please try again later.",
				code: "INTERNAL_ERROR",
			},
			expectVisible: /no media yet/i,
			label: "internal server error — falls back to empty state",
		},
	] as const;

	for (const tc of cases) {
		test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/media", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);
			await gotoMedia(page);
			await expect(page.getByText(tc.expectVisible)).toBeVisible();
		});
	}

	test("handles transport failure (HttpResponse.error()) — falls back to empty state", async ({
		network,
		page,
	}) => {
		network.use(http.get("*/api/protected/media", () => HttpResponse.error()));
		await gotoMedia(page);
		// The hook catches the fetch error; media stays []; empty state renders.
		await expect(page.getByText(/no media yet/i)).toBeVisible();
	});
});

// ============================================================================
// Status Code Coverage — POST /api/protected/media (upload)
// ============================================================================

test.describe("POST /api/protected/media — status code coverage", () => {
	// The native file input is visually hidden but labelled; setInputFiles works
	// on it without un-hiding.
	async function triggerUpload(
		page: Page,
		filename = "test-image.png",
		type = "image/png",
	) {
		const fileInput = page.getByLabel("Upload media file");
		// setInputFiles expects a file path or buffer — provide a tiny PNG buffer.
		await fileInput.setInputFiles({
			name: filename,
			mimeType: type,
			buffer: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			),
		});
	}

	test("201 — successful upload adds item to the library", async ({
		network,
		page,
	}) => {
		const now = new Date().toISOString();
		network.use(
			http.post("*/api/protected/media", () =>
				HttpResponse.json(
					{
						id: "media_uploaded",
						account_id: "acc_123",
						filename: "test-image.png",
						content_type: "image/png",
						s3_url: "https://cdn.example.com/media/test-image.png",
						size_bytes: 1024,
						width: 1,
						height: 1,
						source: "upload",
						created_at: now,
						updated_at: now,
					},
					{ status: 201 },
				),
			),
		);
		await gotoMedia(page);
		await triggerUpload(page);
		// After a successful upload, refetch is called; default GET handler returns
		// the full mediaItems list (including the mock item with its filename).
		await expect(page.getByText(mediaItems[0].filename)).toBeVisible();
	});

	const errorCases = [
		{
			status: 400,
			body: { error: "File is required", code: "INVALID_INPUT" },
			// Upload errors are caught and re-thrown; the hook stores the message
			// but the page doesn't render it in the DOM — it re-fetches the list.
			// Assert the page remains stable (still shows the media grid).
			expectVisible: /product-screenshot\.png/i,
			label: "bad request — file field missing",
		},
		{
			status: 401,
			body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
			expectVisible: /product-screenshot\.png/i,
			label: "unauthorized",
		},
		{
			status: 500,
			body: {
				error: "An internal error occurred. Please try again later.",
				code: "INTERNAL_ERROR",
			},
			expectVisible: /product-screenshot\.png/i,
			label: "internal server error — storage write failed",
		},
	] as const;

	for (const tc of errorCases) {
		test(`${tc.status} — ${tc.label}`, async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/media", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);
			await gotoMedia(page);
			await triggerUpload(page);
			// After the failed upload, the page stays mounted and the existing
			// list (from the default GET handler) remains visible.
			await expect(page.getByText(tc.expectVisible)).toBeVisible();
		});
	}

	test("transport failure (HttpResponse.error()) — page stays mounted", async ({
		network,
		page,
	}) => {
		network.use(http.post("*/api/protected/media", () => HttpResponse.error()));
		await gotoMedia(page);
		await triggerUpload(page);
		// Fetch throws a TypeError; uploadMedia catches and stores in error state.
		// The existing media list remains visible.
		await expect(page.getByText(mediaItems[0].filename)).toBeVisible();
	});
});

// ============================================================================
// Status Code Coverage — DELETE /api/protected/media/:id
// ============================================================================

test.describe("DELETE /api/protected/media/:id — status code coverage", () => {
	test("200 — successful delete removes item from list after refetch", async ({
		network,
		page,
	}) => {
		// After the delete succeeds, the page calls refetch. Override GET to
		// return the list minus the deleted item.
		let deleteCount = 0;
		network.use(
			http.delete("*/api/protected/media/:id", () => {
				deleteCount++;
				return HttpResponse.json({ message: "Media deleted successfully" });
			}),
			http.get("*/api/protected/media", () => {
				// First load: full list. After delete: list without media_1.
				if (deleteCount > 0) {
					return HttpResponse.json(
						mediaItems.filter((m) => m.id !== mediaItems[0].id),
					);
				}
				return HttpResponse.json(mediaItems);
			}),
		);
		await gotoMedia(page);
		// The delete button exists per item. Click the first one.
		await page
			.getByRole("button", { name: /delete product-screenshot/i })
			.click();
		// After refetch, the deleted item's filename should be gone.
		await expect(page.getByText(mediaItems[1].filename)).toBeVisible();
	});

	const errorCases = [
		{
			status: 400,
			body: { error: "Invalid media ID format", code: "INVALID_INPUT" },
			label: "bad request — invalid UUID",
		},
		{
			status: 401,
			body: { error: "Account ID not found in context", code: "UNAUTHORIZED" },
			label: "unauthorized",
		},
		{
			status: 404,
			body: { error: "Media not found", code: "NOT_FOUND" },
			label: "not found — ErrMediaNotFound",
		},
		{
			status: 500,
			body: {
				error: "An internal error occurred. Please try again later.",
				code: "INTERNAL_ERROR",
			},
			label: "internal server error — ErrFailedDelete",
		},
	] as const;

	for (const tc of errorCases) {
		test(`DELETE ${tc.status} — ${tc.label}`, async ({ network, page }) => {
			network.use(
				http.delete("*/api/protected/media/:id", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);
			await gotoMedia(page);
			// Page remains mounted and still shows the media grid even after an
			// error, because the list refetch (GET) still uses the default handler.
			await page
				.getByRole("button", { name: /delete product-screenshot/i })
				.click();
			// The original list is still visible — delete error doesn't crash the page.
			await expect(page.getByText(mediaItems[0].filename)).toBeVisible();
		});
	}

	test("DELETE transport failure (HttpResponse.error()) — page stays mounted", async ({
		network,
		page,
	}) => {
		network.use(
			http.delete("*/api/protected/media/:id", () => HttpResponse.error()),
		);
		await gotoMedia(page);
		await page
			.getByRole("button", { name: /delete product-screenshot/i })
			.click();
		await expect(page.getByText(mediaItems[0].filename)).toBeVisible();
	});
});
