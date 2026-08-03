/**
 * Showcase Post from Brief E2E Tests (EP-005)
 *
 * A modal on /posts with a single brief textarea. Submit fires
 * POST /api/protected/showcase-posts (fire-and-forget — no job-status UI,
 * that's a hard PRD non-goal). On 202 the modal closes and a success banner
 * appears. On any 4xx/5xx/transport failure the modal stays open and shows
 * an inline error (TextArea's `errorMessage` → `role="alert"` inside the
 * dialog) — no toast/banner is rendered in that path.
 *
 * THIS FILE IS EXPECTED TO BE RED until the "Create Showcase Post" modal is
 * built — the trigger button, dialog, and wiring described by the selector
 * contract below do not exist yet. Failures should be "element not found",
 * not a syntax/type error in this spec.
 */
import type { Locator, Page } from "@playwright/test";
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import {
	showcaseEndpoints,
	showcaseScenarios,
} from "./handlers/showcase.handlers";

const TRIGGER_NAME = /create showcase post/i;
const DIALOG_NAME = /create showcase post/i;
const BRIEF_LABEL = /brief/i;

async function openModal(page: Page): Promise<Locator> {
	await page.goto("/posts");
	await page.waitForLoadState("networkidle");
	await page.getByRole("button", { name: TRIGGER_NAME }).click();
	return page.getByRole("dialog", { name: DIALOG_NAME });
}

async function fillAndSubmit(
	dialog: Locator,
	brief = "Showcase the new Button component",
) {
	await dialog.getByRole("textbox", { name: BRIEF_LABEL }).fill(brief);
	await dialog.getByRole("button", { name: "Generate" }).click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Table-drive: every error status this endpoint can return. In every case the
// dialog stays open, an inline `role="alert"` error appears inside it, and no
// success banner is rendered.
// ─────────────────────────────────────────────────────────────────────────────

const errorCases = [
	{
		label: "400 — generic validation failure",
		handler: () => showcaseEndpoints.create[400](),
	},
	{
		label: "400 — SHOWCASE_NO_COMPONENT_MATCH",
		handler: () => showcaseScenarios.noComponentMatch(),
	},
	{
		label: "401 — unauthorized",
		handler: () => showcaseEndpoints.create[401](),
	},
	{
		label: "403 — forbidden",
		handler: () => showcaseEndpoints.create[403](),
	},
	{
		label: "500 — internal error",
		handler: () => showcaseEndpoints.create[500](),
	},
	{
		label: "503 — SHOWCASE_ENQUEUE_FAILED",
		handler: () => showcaseEndpoints.create[503](),
	},
] as const;

test.describe("Create Showcase Post modal", () => {
	// =========================================================================
	// Trigger + open/close
	// =========================================================================

	test("trigger renders on /posts", async ({ page }) => {
		await page.goto("/posts");
		await page.waitForLoadState("networkidle");

		await expect(
			page.getByRole("button", { name: TRIGGER_NAME }),
		).toBeVisible();
	});

	test("clicking the trigger opens the modal with the brief textarea", async ({
		page,
	}) => {
		const dialog = await openModal(page);

		await expect(dialog).toBeVisible();
		await expect(
			dialog.getByRole("textbox", { name: BRIEF_LABEL }),
		).toBeVisible();
	});

	test("clicking Cancel closes the modal without firing a request", async ({
		page,
		network,
	}) => {
		// If Cancel fired a POST, this handler would resolve it as a success —
		// the assertion below (no dialog, no banner) still fails the test if a
		// stray request slipped through and somehow produced visible feedback.
		network.use(
			http.post("*/api/protected/showcase-posts", () => {
				throw new Error(
					"POST /api/protected/showcase-posts must not be called on Cancel",
				);
			}),
		);

		const dialog = await openModal(page);
		await dialog.getByRole("button", { name: "Cancel" }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page.getByRole("alert")).not.toBeVisible();
	});

	// =========================================================================
	// Happy path — 202 Accepted
	// =========================================================================

	test("submitting the brief on 202 closes the modal and shows a success banner", async ({
		page,
		network,
	}) => {
		network.use(showcaseEndpoints.create[200]());

		const dialog = await openModal(page);
		await fillAndSubmit(dialog);

		await expect(dialog).not.toBeVisible();
		await expect(page.getByRole("alert")).toBeVisible();
	});

	test("reopening the modal after a successful submit shows the textarea cleared", async ({
		page,
		network,
	}) => {
		network.use(showcaseEndpoints.create[200]());

		const dialog = await openModal(page);
		await fillAndSubmit(dialog);
		await expect(dialog).not.toBeVisible();

		const reopened = await openModal(page);
		await expect(
			reopened.getByRole("textbox", { name: BRIEF_LABEL }),
		).toHaveValue("");
	});

	// =========================================================================
	// Status Code Coverage — POST /api/protected/showcase-posts (errors)
	// =========================================================================

	test.describe("Status Code Coverage — POST /showcase-posts (errors)", () => {
		for (const tc of errorCases) {
			test(`submitting the brief on ${tc.label} keeps the modal open with an inline error`, async ({
				page,
				network,
			}) => {
				network.use(tc.handler());

				const dialog = await openModal(page);
				await fillAndSubmit(dialog);

				await expect(dialog).toBeVisible();
				await expect(dialog.getByRole("alert")).toBeVisible();
				// No success banner should escape the dialog on an error path —
				// every alert on the page must live inside the still-open dialog.
				const pageAlerts = await page.getByRole("alert").count();
				const dialogAlerts = await dialog.getByRole("alert").count();
				expect(pageAlerts).toBe(dialogAlerts);
			});
		}

		test("submitting the brief on transport failure keeps the modal open with an inline error", async ({
			page,
			network,
		}) => {
			network.use(
				http.post("*/api/protected/showcase-posts", () => HttpResponse.error()),
			);

			const dialog = await openModal(page);
			await fillAndSubmit(dialog);

			await expect(dialog).toBeVisible();
			await expect(dialog.getByRole("alert")).toBeVisible();
		});
	});
});
