/**
 * Account Settings — Site Publish and Voice Profile Tab E2E Tests
 *
 * Covers /account?tab=site-publish (F2) and /account?tab=voice-profile (F7).
 *
 * Endpoints exercised:
 *   GET/PUT /api/protected/settings/voice → 200, 400, 401, 403, 404, 409, 500, 503, transport
 *   GET /api/protected/settings/site-publish → 200, 404 (not configured), 500
 *   PUT /api/protected/settings/site-publish → 200, 400, 401, 403, 409, 500, transport
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { settingsEndpoints } from "./handlers/settings.handlers";
import { sitePublishEndpoints } from "./handlers/sitePublish.handlers";
import { sitePublishTarget, voiceProfile } from "./mocks/data";

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

		await expect(
			page.getByRole("status").filter({ hasText: /saved|success/i }),
		).toBeVisible();
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

const voiceUrl = "/account?tab=voice-profile";
const voiceSaveError = "Failed to save voice profile. Please try again.";

const voiceSaveStatuses = [
	400,
	401,
	403,
	404,
	409,
	500,
	503,
	"transport",
] as const;

test.describe("Account — Voice Profile Tab", () => {
	test("load fills every field from the saved profile", async ({
		network,
		page,
	}) => {
		network.use(
			http.get("*/api/protected/settings/voice", () =>
				HttpResponse.json({
					...voiceProfile,
					custom_instructions: "Never use hashtags.",
				}),
			),
		);

		await page.goto(voiceUrl);

		await expect(page.getByRole("combobox", { name: "Tone" })).toHaveValue(
			voiceProfile.tone,
		);
		await expect(page.getByRole("combobox", { name: "Style" })).toHaveValue(
			voiceProfile.style,
		);
		await expect(page.getByLabel("Industry")).toHaveValue(
			voiceProfile.industry,
		);
		await expect(page.getByLabel("Target Audience")).toHaveValue(
			voiceProfile.target_audience,
		);
		await expect(page.getByLabel("Example Posts")).toHaveValue(
			voiceProfile.example_posts.join("\n"),
		);
		await expect(page.getByLabel("Custom Instructions")).toHaveValue(
			"Never use hashtags.",
		);
	});

	test("save (200) sends the edited fields and shows the saved status", async ({
		network,
		page,
	}) => {
		network.use(settingsEndpoints.getVoice[200]());
		await page.goto(voiceUrl);
		await expect(page.getByLabel("Industry")).toHaveValue(
			voiceProfile.industry,
		);

		await page.getByRole("combobox", { name: "Tone" }).selectOption("Casual");
		await page
			.getByRole("combobox", { name: "Style" })
			.selectOption("Detailed");
		await page.getByLabel("Industry").fill("fintech");

		const requestPromise = page.waitForRequest(
			(r) =>
				r.method() === "PUT" &&
				r.url().includes("/api/protected/settings/voice"),
		);
		network.use(settingsEndpoints.updateVoice[200]());
		await page.getByText(/save/i).last().click();

		const body = (await requestPromise).postDataJSON();
		expect(body).toMatchObject({
			tone: "casual",
			style: "detailed",
			industry: "fintech",
		});
		await expect(
			page.getByRole("status").filter({ hasText: /voice profile saved/i }),
		).toBeVisible();
	});

	for (const status of voiceSaveStatuses) {
		test(`save handles ${status}`, async ({ network, page }) => {
			network.use(settingsEndpoints.getVoice[200]());
			await page.goto(voiceUrl);
			await expect(page.getByLabel("Industry")).toHaveValue(
				voiceProfile.industry,
			);

			network.use(settingsEndpoints.updateVoice[status]());
			await page.getByText(/save/i).last().click();

			await expect(page.getByRole("alert")).toHaveText(voiceSaveError);
		});
	}

	test("not configured (404) — empty form, no error alert", async ({
		network,
		page,
	}) => {
		network.use(settingsEndpoints.getVoice[404]());

		await page.goto(voiceUrl);
		await page.waitForLoadState("networkidle");

		await expect(page.getByLabel("Industry")).toHaveValue("");
		await expect(page.getByLabel("Target Audience")).toHaveValue("");
		await expect(page.getByLabel("Example Posts")).toHaveValue("");
		await expect(page.getByLabel("Custom Instructions")).toHaveValue("");
		await expect(page.getByRole("alert")).not.toBeVisible();
	});

	test("GET error (500) shows full-tab error alert, not the form", async ({
		network,
		page,
	}) => {
		network.use(settingsEndpoints.getVoice[500]());

		await page.goto(voiceUrl);
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("alert")).toBeVisible();
		await expect(page.getByLabel("Industry")).not.toBeVisible();
	});
});

test.describe("Account — page heading and tabs", () => {
	test("renders the Settings h1 with Billing selected by default", async ({
		page,
	}) => {
		await page.goto("/account");

		await expect(
			page.getByRole("heading", { level: 1, name: "Settings" }),
		).toBeVisible();
		await expect(page.getByRole("tab", { name: /billing/i })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("?tab=site-publish selects the Site Publish tab", async ({ page }) => {
		await page.goto("/account?tab=site-publish");

		await expect(
			page.getByRole("tab", { name: /site publish/i }),
		).toHaveAttribute("aria-selected", "true");
	});

	test("clicking Voice Profile sets ?tab=voice-profile and selects it", async ({
		page,
	}) => {
		await page.goto("/account");

		const tab = page.getByRole("tab", { name: /voice profile/i });
		await tab.click();

		await expect(page).toHaveURL(/\/account\?tab=voice-profile$/);
		await expect(tab).toHaveAttribute("aria-selected", "true");
	});
});
