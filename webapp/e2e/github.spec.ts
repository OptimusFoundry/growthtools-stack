/**
 * GitHub E2E Tests (/github and /github/:id)
 *
 * Endpoints exercised (each table-driven over every setupEndpoint status):
 *   GET  /api/protected/github/connection
 *   GET  /api/protected/github/commits
 *   GET  /api/protected/github/commits/:id
 *   POST /api/protected/github/commits/:id/retry-capture
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/test";
import { githubEndpoints, githubScenarios } from "./handlers/github.handlers";
import type { StatusKey } from "./helpers/endpoint";
import { githubCommit, githubCommitSummaries } from "./mocks/data";

const ALL_STATUSES = [
	200,
	400,
	401,
	403,
	404,
	409,
	500,
	503,
	"transport",
] as const satisfies readonly StatusKey[];

const DETAIL_URL = `/github/${githubCommit.id}`;
const SUBJECT = "feat: add capture pipeline";

// Default error bodies from helpers/endpoint.ts as surfaced by the fetcher.
const RETRY_ERROR_TEXT: Record<number, string> = {
	400: "invalid input",
	401: "Unauthorized",
	403: "Forbidden",
	404: "not found",
	409: "conflict",
	500: "An internal error occurred. Please try again later.",
	503: "service unavailable",
};

const heading = (page: Page) =>
	page.getByRole("heading", { level: 1, name: "GitHub", exact: true });
const commitsTable = (page: Page) =>
	page.getByRole("table", { name: "Commits" });
const notice = (page: Page, text: string | RegExp) =>
	page.getByRole("status").filter({ hasText: text });
const failedAlert = (page: Page) =>
	page.getByRole("alert").filter({ hasText: "Capture failed" });

test.describe("GitHub — commits page", () => {
	test("renders the Topbar title and commit rows", async ({ page }) => {
		await page.goto("/github");

		await expect(heading(page)).toBeVisible();
		const table = commitsTable(page);
		await expect(table).toBeVisible();
		await expect(table.getByRole("row")).toHaveCount(
			githubCommitSummaries.length + 1,
		);
		await expect(table).toContainText("feat: add capture pipeline");
		await expect(table).toContainText("Captured");
		await expect(table).toContainText("Failed");
		await expect(table).toContainText("Waiting");
		await expect(table).toContainText("Generated");
	});

	test("a row links to the commit detail page", async ({ page }) => {
		await page.goto("/github");

		await commitsTable(page)
			.getByRole("link", { name: /feat: add capture pipeline/ })
			.click();

		await expect(page).toHaveURL(DETAIL_URL);
	});

	test("single page of results shows no pagination", async ({ page }) => {
		await page.goto("/github");

		await expect(commitsTable(page)).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: /pagination/i }),
		).toHaveCount(0);
	});

	test("empty list shows the No commits yet state", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitsEmpty());
		await page.goto("/github");

		await expect(page.getByText("No commits yet")).toBeVisible();
		await expect(commitsTable(page)).toHaveCount(0);
	});

	test("paginated list shows navigation and requests the next offset", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitsPaginated());
		await page.goto("/github");

		const pagination = page.getByRole("navigation", { name: /pagination/i });
		await expect(pagination).toBeVisible();
		await expect(commitsTable(page)).toContainText("Commit number 1");

		const nextPage = page.waitForRequest(
			(req) =>
				req.url().includes("/github/commits?") &&
				req.url().includes("offset=25"),
		);
		await pagination.getByRole("button", { name: /^(page )?2$/i }).click();
		await nextPage;

		await expect(commitsTable(page)).toContainText("Commit number 26");
	});

	test.describe("connection endpoint", () => {
		for (const status of ALL_STATUSES) {
			test(`GET connection ${status}`, async ({ network, page }) => {
				network.use(githubEndpoints.connection[status]());
				await page.goto("/github");

				await expect(heading(page)).toBeVisible();
				if (status === 200) {
					await expect(commitsTable(page)).toBeVisible();
				} else {
					await expect(commitsTable(page)).toHaveCount(0);
				}
				if (status === 404) {
					await expect(page.getByText("GitHub isn't connected")).toBeVisible();
				}
			});
		}

		test("404 offers a Connect GitHub link to the platforms tab", async ({
			network,
			page,
		}) => {
			network.use(githubEndpoints.connection[404]());
			await page.goto("/github");

			await expect(page.getByText("GitHub isn't connected")).toBeVisible();
			await expect(
				page.getByRole("link", { name: /connect github/i }),
			).toHaveAttribute("href", "/account?tab=platforms");
		});
	});

	test.describe("commits endpoint", () => {
		for (const status of ALL_STATUSES) {
			test(`GET commits ${status}`, async ({ network, page }) => {
				network.use(githubEndpoints.commits[status]());
				await page.goto("/github");

				await expect(heading(page)).toBeVisible();
				if (status === 200) {
					await expect(commitsTable(page)).toBeVisible();
				} else {
					await expect(commitsTable(page)).toHaveCount(0);
					await expect(
						page.getByRole("link", { name: /feat: add capture pipeline/ }),
					).toHaveCount(0);
				}
			});
		}
	});
});

test.describe("GitHub — commit detail", () => {
	test("renders the commit subject as the page h1", async ({ page }) => {
		await page.goto(DETAIL_URL);

		await expect(
			page.getByRole("heading", { level: 1, name: SUBJECT }),
		).toBeVisible();
		await expect(page.getByText("Adds the worker.")).toBeVisible();
	});

	test("links to the commit on GitHub", async ({ page }) => {
		await page.goto(DETAIL_URL);

		await expect(
			page.getByRole("link", { name: /^view on github/i }),
		).toHaveAttribute("href", githubCommit.commit_url ?? "");
	});

	test("captured commit lists image, video and metadata artifacts", async ({
		page,
	}) => {
		await page.goto(DETAIL_URL);

		await expect(page.getByRole("img", { name: "shot-1.png" })).toBeVisible();
		await expect(page.getByText("demo.mp4")).toBeVisible();
		await expect(page.getByText("steps.json")).toBeVisible();
		await expect(failedAlert(page)).toHaveCount(0);
	});

	test("images only", async ({ network, page }) => {
		network.use(githubScenarios.commitImagesOnly());
		await page.goto(DETAIL_URL);

		await expect(page.getByRole("img", { name: "shot-1.png" })).toBeVisible();
		await expect(page.getByText("demo.mp4")).toHaveCount(0);
		await expect(page.getByText("steps.json")).toHaveCount(0);
	});

	test("video only", async ({ network, page }) => {
		network.use(githubScenarios.commitVideoOnly());
		await page.goto(DETAIL_URL);

		await expect(page.getByText("demo.mp4")).toBeVisible();
		await expect(page.getByRole("img", { name: "shot-1.png" })).toHaveCount(0);
	});

	test("metadata only", async ({ network, page }) => {
		network.use(githubScenarios.commitMetadataOnly());
		await page.goto(DETAIL_URL);

		await expect(page.getByText("steps.json")).toBeVisible();
		await expect(page.getByRole("img", { name: "shot-1.png" })).toHaveCount(0);
	});

	test("processed commit without uploads shows No artifacts yet", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitNoArtifacts());
		await page.goto(DETAIL_URL);

		await expect(page.getByText("No artifacts yet")).toBeVisible();
	});

	test("skipped commit shows the warning with the reason", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitSkipped("Docs-only change"));
		await page.goto(DETAIL_URL);

		const warning = notice(page, "Capture skipped");
		await expect(warning).toBeVisible();
		await expect(warning).toContainText("Docs-only change");
		await expect(failedAlert(page)).toHaveCount(0);
	});

	test("waiting commit shows the Waiting for capture notice", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitWaiting());
		await page.goto(DETAIL_URL);

		await expect(notice(page, "Waiting for capture")).toBeVisible();
		await expect(page.getByText("No artifacts yet")).toHaveCount(0);
	});

	test("queued but unprocessed commit shows Capture in progress", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitInProgress());
		await page.goto(DETAIL_URL);

		await expect(notice(page, "Capture in progress")).toBeVisible();
	});

	test("failed commit shows the Capture failed alert with Retry capture", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitFailed());
		await page.goto(DETAIL_URL);

		const alert = failedAlert(page);
		await expect(alert).toBeVisible();
		await expect(alert).toContainText("browser crashed");
		await expect(
			alert.getByRole("button", { name: "Retry capture" }),
		).toBeEnabled();
	});

	test("linked post and blog expose View generated links", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitWithPost());
		await page.goto(DETAIL_URL);

		await expect(
			page.getByRole("link", { name: /view generated post/i }),
		).toHaveAttribute("href", "/posts/post_1");
		await expect(
			page.getByRole("link", { name: /view generated blog/i }),
		).toHaveCount(0);
	});

	test("linked blog exposes the View generated blog link", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitWithBlog());
		await page.goto(DETAIL_URL);

		await expect(
			page.getByRole("link", { name: /view generated blog/i }),
		).toHaveAttribute("href", "/blog/blog_1");
	});

	test("deleted post replaces the link with a Post deleted notice", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitPostDeleted());
		await page.goto(DETAIL_URL);

		await expect(
			notice(page, /draft post created from this commit/),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: /view generated post/i }),
		).toHaveCount(0);
	});

	test("deleted blog replaces the link with a Blog post deleted notice", async ({
		network,
		page,
	}) => {
		network.use(githubScenarios.commitBlogDeleted());
		await page.goto(DETAIL_URL);

		await expect(
			notice(page, /draft blog post created from this commit/),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: /view generated blog/i }),
		).toHaveCount(0);
	});

	test.describe("commit endpoint", () => {
		for (const status of ALL_STATUSES) {
			test(`GET commit ${status}`, async ({ network, page }) => {
				network.use(githubEndpoints.commit[status]());
				await page.goto(DETAIL_URL);

				if (status === 200) {
					await expect(
						page.getByRole("heading", { level: 1, name: SUBJECT }),
					).toBeVisible();
					return;
				}
				await expect(
					page.getByRole("heading", { level: 1, name: SUBJECT }),
				).toHaveCount(0);
				if (status === 404) {
					await expect(page.getByText("Commit not found")).toBeVisible();
				}
			});
		}
	});

	test.describe("retry-capture endpoint", () => {
		for (const status of ALL_STATUSES) {
			test(`POST retry-capture ${status}`, async ({ network, page }) => {
				network.use(
					githubScenarios.commitFailed(),
					githubEndpoints.retryCapture[status](),
				);
				await page.goto(DETAIL_URL);

				await failedAlert(page)
					.getByRole("button", { name: "Retry capture" })
					.click();

				if (status === 200) {
					await expect(notice(page, "Capture in progress")).toBeVisible();
					await expect(failedAlert(page)).toHaveCount(0);
					return;
				}
				const expected =
					status === "transport"
						? /Retry failed: .+/
						: `Retry failed: ${RETRY_ERROR_TEXT[status]}`;
				await expect(failedAlert(page)).toContainText(expected);
				await expect(
					failedAlert(page).getByRole("button", { name: "Retry capture" }),
				).toBeEnabled();
			});
		}
	});
});
