/**
 * Account — Platform and GitHub connections (/account?tab=platforms)
 *
 * Endpoints exercised (each: 200, 400, 401, 403, 404, 409, 500, 503, transport):
 *   GET    /api/protected/platforms
 *   POST   /api/protected/platforms/bluesky
 *   POST   /api/protected/platforms/token
 *   DELETE /api/protected/platforms/:id
 *   GET    /api/protected/github/connection
 *   DELETE /api/protected/github/connection
 *   GET    /api/protected/github/oauth/init
 *   GET    /api/protected/github/repos
 *   POST   /api/protected/github/repos/:owner/:repo/connect
 *   DELETE /api/protected/github/repos/:owner/:repo
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/test";
import {
	githubEndpoints,
	githubReposEndpoints,
	githubScenarios,
} from "./handlers/github.handlers";
import {
	platformsEndpoints,
	platformsScenarios,
} from "./handlers/platforms.handlers";
import type { StatusKey } from "./helpers/endpoint";
import { toastLocator } from "./helpers/toast";

const tabUrl = "/account?tab=platforms";

const ERROR_STATUSES = [
	400,
	401,
	403,
	404,
	409,
	500,
	503,
	"transport",
] as const satisfies readonly StatusKey[];

const GITHUB_OFF = githubEndpoints.connection[404]();

const outbound = (page: Page) =>
	page.getByRole("region", { name: "Outbound", exact: true });
const inbound = (page: Page) =>
	page.getByRole("region", { name: "Inbound", exact: true });
const button = (page: Page, name: string) =>
	page.getByRole("button", { name, exact: true });

test.describe("Account — platform connections", () => {
	test("renders Outbound and Inbound sections with a row per connection", async ({
		page,
	}) => {
		await page.goto(tabUrl);

		await expect(outbound(page)).toBeVisible();
		await expect(inbound(page)).toBeVisible();

		const xRow = outbound(page)
			.getByRole("listitem")
			.filter({ hasText: "X (Twitter)" });
		await expect(xRow).toContainText("Connected");
		await expect(button(page, "Disconnect X (Twitter)")).toBeVisible();

		// Default fixture has BlueSky expired, so it offers Reconnect.
		await expect(button(page, "Reconnect BlueSky")).toBeVisible();
		await expect(button(page, "Connect Threads")).toBeVisible();

		const githubRow = inbound(page)
			.getByRole("listitem")
			.filter({ hasText: "GitHub" });
		await expect(githubRow.first()).toContainText("Connected");
		await expect(button(page, "Disconnect GitHub")).toBeVisible();
	});

	test.describe("load errors", () => {
		test("platforms GET 500 raises the load toast", async ({
			network,
			page,
		}) => {
			network.use(platformsEndpoints.list[500]());
			await page.goto(tabUrl);

			await expect(
				toastLocator(page, "alert", "Couldn't load platform connections"),
			).toBeVisible();
		});

		test("platforms GET 404 raises no toast", async ({ network, page }) => {
			network.use(platformsEndpoints.list[404]());
			await page.goto(tabUrl);
			await page.waitForLoadState("networkidle");

			await expect(outbound(page)).toBeVisible();
			await expect(toastLocator(page, "alert")).toHaveCount(0);
		});
	});

	test.describe("BlueSky connect", () => {
		async function openDialog(page: Page) {
			await button(page, "Connect BlueSky").click();
			const dialog = page.getByRole("dialog", { name: /connect bluesky/i });
			await expect(dialog).toBeVisible();
			return dialog;
		}

		test("dialog has Handle and App Password fields; Connect needs both", async ({
			network,
			page,
		}) => {
			network.use(...platformsScenarios.blueskyConnectFlow());
			await page.goto(tabUrl);
			const dialog = await openDialog(page);
			const connect = dialog.getByRole("button", {
				name: "Connect",
				exact: true,
			});

			await expect(connect).toBeDisabled();
			await dialog.getByLabel("Handle").fill("me.bsky.social");
			await expect(connect).toBeDisabled();
			await dialog.getByLabel("App Password").fill("abcd-efgh-ijkl-mnop");
			await expect(connect).toBeEnabled();
		});

		test("Cancel closes the dialog without calling the API", async ({
			network,
			page,
		}) => {
			network.use(...platformsScenarios.blueskyConnectFlow());
			await page.goto(tabUrl);
			const dialog = await openDialog(page);

			await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

			await expect(dialog).toBeHidden();
			await expect(button(page, "Connect BlueSky")).toBeVisible();
		});

		test("200 closes the dialog and the row refetches to Connected", async ({
			network,
			page,
		}) => {
			network.use(...platformsScenarios.blueskyConnectFlow());
			await page.goto(tabUrl);
			const dialog = await openDialog(page);

			await dialog.getByLabel("Handle").fill("testuser.bsky.social");
			await dialog.getByLabel("App Password").fill("abcd-efgh-ijkl-mnop");
			await dialog
				.getByRole("button", { name: "Connect", exact: true })
				.click();

			await expect(dialog).toBeHidden();
			const row = outbound(page)
				.getByRole("listitem")
				.filter({ hasText: "BlueSky" });
			await expect(row).toContainText("Connected");
			await expect(button(page, "Disconnect BlueSky")).toBeVisible();
		});

		for (const status of [400, 401, 500] as const) {
			test(`${status} keeps the dialog open with an inline alert and no toast`, async ({
				network,
				page,
			}) => {
				network.use(
					platformsEndpoints.bluesky[status](),
					platformsScenarios.withoutBluesky(),
				);
				await page.goto(tabUrl);
				const dialog = await openDialog(page);

				await dialog.getByLabel("Handle").fill("testuser.bsky.social");
				await dialog.getByLabel("App Password").fill("wrong-password");
				await dialog
					.getByRole("button", { name: "Connect", exact: true })
					.click();

				await expect(dialog.getByRole("alert")).toHaveText(
					"Failed to connect BlueSky. Check your handle and app password.",
				);
				await expect(dialog).toBeVisible();
				await expect(toastLocator(page, "alert")).toHaveCount(0);
			});
		}
	});

	test.describe("token platform connect (Threads)", () => {
		test("200 raises the Connected toast", async ({ network, page }) => {
			network.use(platformsEndpoints.token[200]());
			await page.goto(tabUrl);

			await button(page, "Connect Threads").click();

			await expect(
				toastLocator(page, "status", "Connected Threads"),
			).toBeVisible();
		});

		for (const status of ERROR_STATUSES) {
			test(`${status} raises the Couldn't connect toast`, async ({
				network,
				page,
			}) => {
				network.use(platformsEndpoints.token[status]());
				await page.goto(tabUrl);

				await button(page, "Connect Threads").click();

				await expect(
					toastLocator(page, "alert", "Couldn't connect Threads"),
				).toBeVisible();
			});
		}
	});

	test.describe("platform disconnect", () => {
		test("200 raises the Platform disconnected toast", async ({
			network,
			page,
		}) => {
			network.use(platformsEndpoints.disconnect[200]());
			await page.goto(tabUrl);

			await button(page, "Disconnect X (Twitter)").click();

			await expect(
				toastLocator(page, "status", "Platform disconnected"),
			).toBeVisible();
		});

		for (const status of ERROR_STATUSES) {
			test(`${status} raises the Couldn't disconnect toast`, async ({
				network,
				page,
			}) => {
				network.use(platformsEndpoints.disconnect[status]());
				await page.goto(tabUrl);

				await button(page, "Disconnect X (Twitter)").click();

				await expect(
					toastLocator(page, "alert", "Couldn't disconnect platform"),
				).toBeVisible();
			});
		}
	});
});

test.describe("Account — GitHub connection", () => {
	test("GitHub OAuth init 2xx sends GET github/oauth/init", async ({
		network,
		page,
	}) => {
		network.use(GITHUB_OFF, githubEndpoints.oauthInit[200]());
		await page.goto(tabUrl);

		// Armed before the click; the follow-up navigation is deliberately not asserted.
		const initRequest = page.waitForRequest(
			(req) =>
				req.method() === "GET" && req.url().includes("/github/oauth/init"),
		);
		await button(page, "Connect GitHub").click();
		await initRequest;
	});

	for (const status of ERROR_STATUSES) {
		test(`GitHub OAuth init ${status} raises the Couldn't start toast`, async ({
			network,
			page,
		}) => {
			network.use(GITHUB_OFF, githubEndpoints.oauthInit[status]());
			await page.goto(tabUrl);

			await button(page, "Connect GitHub").click();

			await expect(
				toastLocator(page, "alert", "Couldn't start GitHub OAuth"),
			).toBeVisible();
		});
	}

	test("GitHub disconnect 200 raises the disconnected toast", async ({
		network,
		page,
	}) => {
		network.use(githubEndpoints.disconnect[200]());
		await page.goto(tabUrl);

		await button(page, "Disconnect GitHub").click();

		await expect(
			toastLocator(page, "status", "GitHub disconnected"),
		).toBeVisible();
	});

	for (const status of ERROR_STATUSES) {
		test(`GitHub disconnect ${status} raises the Couldn't disconnect toast`, async ({
			network,
			page,
		}) => {
			network.use(githubEndpoints.disconnect[status]());
			await page.goto(tabUrl);

			await button(page, "Disconnect GitHub").click();

			await expect(
				toastLocator(page, "alert", "Couldn't disconnect GitHub"),
			).toBeVisible();
		});
	}

	test("repos GET 500 raises the Couldn't load repositories toast", async ({
		network,
		page,
	}) => {
		network.use(githubReposEndpoints.list[500]());
		await page.goto(tabUrl);

		await expect(
			toastLocator(page, "alert", "Couldn't load repositories"),
		).toBeVisible();
	});

	test.describe("repo toggle", () => {
		const off = "octo-tester/growth-app";
		const on = "octo-tester/internal-tools";
		const sw = (page: Page, name: string) =>
			page.getByRole("switch", { name, exact: true });

		test("connect 200 raises the toast and the switch flips", async ({
			network,
			page,
		}) => {
			network.use(...githubScenarios.reposStateful());
			await page.goto(tabUrl);

			await expect(sw(page, `Connect ${off}`)).not.toBeChecked();
			await sw(page, `Connect ${off}`).click();

			await expect(
				toastLocator(page, "status", `Connected ${off}`),
			).toBeVisible();
			await expect(sw(page, `Disconnect ${off}`)).toBeChecked();
		});

		for (const status of [409, 500] as const) {
			test(`connect ${status} raises the error toast and the switch stays off`, async ({
				network,
				page,
			}) => {
				network.use(
					githubReposEndpoints.connect[status](),
					...githubScenarios.reposStateful(),
				);
				await page.goto(tabUrl);

				await sw(page, `Connect ${off}`).click();

				await expect(
					toastLocator(page, "alert", `Couldn't connect ${off}`),
				).toBeVisible();
				await expect(sw(page, `Connect ${off}`)).not.toBeChecked();
			});
		}

		test("disconnect 200 raises the toast and the switch flips back", async ({
			network,
			page,
		}) => {
			network.use(...githubScenarios.reposStateful());
			await page.goto(tabUrl);

			await expect(sw(page, `Disconnect ${on}`)).toBeChecked();
			await sw(page, `Disconnect ${on}`).click();

			await expect(
				toastLocator(page, "status", `Disconnected ${on}`),
			).toBeVisible();
			await expect(sw(page, `Connect ${on}`)).not.toBeChecked();
		});

		for (const status of [409, 500] as const) {
			test(`disconnect ${status} raises the error toast and the switch stays on`, async ({
				network,
				page,
			}) => {
				network.use(
					githubReposEndpoints.disconnect[status](),
					...githubScenarios.reposStateful(),
				);
				await page.goto(tabUrl);

				await sw(page, `Disconnect ${on}`).click();

				await expect(
					toastLocator(page, "alert", `Couldn't disconnect ${on}`),
				).toBeVisible();
				await expect(sw(page, `Disconnect ${on}`)).toBeChecked();
			});
		}
	});
});
