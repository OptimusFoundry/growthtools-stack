/**
 * Account Settings — Site Publish Tab E2E Tests
 *
 * New spec — no settings tab had Playwright coverage before this. Covers the
 * Site Publish tab at /account?tab=site-publish (F2).
 *
 * Endpoints exercised:
 *   GET /api/protected/settings/site-publish → 200, 404 (not configured), 500
 *   PUT /api/protected/settings/site-publish → 200, 400, 401, 403, 409, 500, transport
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { sitePublishEndpoints } from "./handlers/sitePublish.handlers";
import { sitePublishTarget } from "./mocks/data";

const tabUrl = "/account?tab=site-publish";

test.describe("Account — Site Publish Tab", () => {
	test("loading state resolves to the settled form", async ({ page }) => {
		await page.goto(tabUrl);
		await page.waitForLoadState("networkidle");

		await expect(page.getByLabel("Repository Owner")).toBeVisible();
	});

	test("not configured (404) — empty form, no error alert", async ({
		network,
		page,
	}) => {
		network.use(sitePublishEndpoints.get[404]());

		await page.goto(tabUrl);
		await page.waitForLoadState("networkidle");

		await expect(page.getByLabel("Repository Owner")).toHaveValue("");
		await expect(page.getByLabel("Repository Name")).toHaveValue("");
		await expect(page.getByLabel("Base Branch")).toHaveValue("");
		await expect(page.getByLabel("Content Path")).toHaveValue("");
		await expect(page.getByRole("alert")).not.toBeVisible();
	});

	test("configured (200) — fields pre-filled with fixture values", async ({
		network,
		page,
	}) => {
		network.use(sitePublishEndpoints.get[200]());

		await page.goto(tabUrl);
		await page.waitForLoadState("networkidle");

		await expect(page.getByLabel("Repository Owner")).toHaveValue(
			sitePublishTarget.repo_owner,
		);
		await expect(page.getByLabel("Repository Name")).toHaveValue(
			sitePublishTarget.repo_name,
		);
		await expect(page.getByLabel("Base Branch")).toHaveValue(
			sitePublishTarget.base_branch,
		);
		await expect(page.getByLabel("Content Path")).toHaveValue(
			sitePublishTarget.content_path,
		);
	});

	test("save success shows a success alert", async ({ network, page }) => {
		network.use(sitePublishEndpoints.get[404]());

		await page.goto(tabUrl);
		await page.waitForLoadState("networkidle");

		await page.getByLabel("Repository Owner").fill("shubhanshu-dev");
		await page.getByLabel("Repository Name").fill("site");
		await page.getByLabel("Base Branch").fill("main");
		await page.getByLabel("Content Path").fill("src/content/blog");

		network.use(sitePublishEndpoints.update[200]());
		await page.getByRole("button", { name: /save/i }).click();
		await page.waitForLoadState("networkidle");

		const alert = page.getByRole("alert");
		await expect(alert).toBeVisible();
		await expect(alert).toContainText(/saved|success/i);
	});

	// =========================================================================
	// Status Code Coverage — PUT /api/protected/settings/site-publish
	// =========================================================================

	const saveErrorCases = [
		{
			status: 400,
			body: { error: "Validation failed", code: "INVALID_INPUT" },
			expect: /validation failed|invalid/i,
			label: "validation error",
		},
		{
			status: 401,
			body: { error: "Unauthorized", code: "UNAUTHORIZED" },
			expect: /unauthorized|sign in|log in/i,
			label: "unauthorized",
		},
		{
			status: 403,
			body: { error: "Forbidden", code: "FORBIDDEN" },
			expect: /forbidden|not allowed|permission/i,
			label: "forbidden",
		},
		{
			status: 409,
			body: { error: "conflict", code: "CONFLICT" },
			expect: /conflict|already/i,
			label: "conflict",
		},
		{
			status: 500,
			body: { error: "Internal server error", code: "INTERNAL_ERROR" },
			expect: /error|something went wrong|failed|unavailable/i,
			label: "server error",
		},
	] as const;

	for (const tc of saveErrorCases) {
		test(`PUT /settings/site-publish handles ${tc.status} — ${tc.label}`, async ({
			network,
			page,
		}) => {
			network.use(sitePublishEndpoints.get[404]());

			await page.goto(tabUrl);
			await page.waitForLoadState("networkidle");

			await page.getByLabel("Repository Owner").fill("shubhanshu-dev");
			await page.getByLabel("Repository Name").fill("site");
			await page.getByLabel("Base Branch").fill("main");
			await page.getByLabel("Content Path").fill("src/content/blog");

			network.use(
				http.put("*/api/protected/settings/site-publish", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);
			await page.getByRole("button", { name: /save/i }).click();
			await page.waitForLoadState("networkidle");

			const alert = page.getByRole("alert");
			await expect(alert).toBeVisible();
			await expect(alert).toContainText(tc.expect);
		});
	}

	test("PUT /settings/site-publish handles transport failure", async ({
		network,
		page,
	}) => {
		network.use(sitePublishEndpoints.get[404]());

		await page.goto(tabUrl);
		await page.waitForLoadState("networkidle");

		await page.getByLabel("Repository Owner").fill("shubhanshu-dev");
		await page.getByLabel("Repository Name").fill("site");
		await page.getByLabel("Base Branch").fill("main");
		await page.getByLabel("Content Path").fill("src/content/blog");

		network.use(
			http.put("*/api/protected/settings/site-publish", () =>
				HttpResponse.error(),
			),
		);
		await page.getByRole("button", { name: /save/i }).click();
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("alert")).toBeVisible();
	});

	test("GET error (500) on first load shows full-tab error alert, not the empty-form state", async ({
		network,
		page,
	}) => {
		network.use(
			http.get("*/api/protected/settings/site-publish", () =>
				HttpResponse.json(
					{ error: "Internal server error", code: "INTERNAL_ERROR" },
					{ status: 500 },
				),
			),
		);

		await page.goto(tabUrl);
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("alert")).toBeVisible();
		await expect(page.getByLabel("Repository Owner")).not.toBeVisible();
	});
});
