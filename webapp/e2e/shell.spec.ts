/**
 * App shell E2E tests: theme, route rendering, sidebar, mobile drawer, topbar
 * and landmarks. Default MSW handlers serve a logged-in Pro user whose
 * persona is content_creator.
 */
import type { Page } from "@playwright/test";
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { scenarios } from "./handlers";
import { fullBlogPost } from "./handlers/blog.handlers";
import { githubCommit, posts } from "./mocks/data";

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

type MarkedWindow = { __marker?: string };

function sidebarNav(page: Page) {
	return page.getByRole("navigation", { name: "Main" });
}

function themeToggle(page: Page) {
	return page.getByRole("button", { name: /^(dark|light) mode$/i });
}

function storedTheme(page: Page, key: string) {
	return page.evaluate((k) => localStorage.getItem(k), key);
}

// Init scripts re-run on every navigation, so the flag keeps the seed from
// overwriting a choice the app makes later in the same test.
async function seedStorage(page: Page, entries: Record<string, string>) {
	await page.addInitScript((seed) => {
		if (sessionStorage.getItem("e2e-seeded")) return;
		sessionStorage.setItem("e2e-seeded", "1");
		for (const [key, value] of Object.entries(seed)) {
			localStorage.setItem(key, value);
		}
	}, entries);
}

// A kept window marker plus zero document requests proves client-side routing.
async function trackClientNavigation(page: Page) {
	await page.evaluate(() => {
		(window as unknown as MarkedWindow).__marker = "kept";
	});
	const documentRequests: string[] = [];
	page.on("request", (request) => {
		if (request.resourceType() === "document") {
			documentRequests.push(request.url());
		}
	});
	return async () => {
		expect(
			await page.evaluate(() => (window as unknown as MarkedWindow).__marker),
		).toBe("kept");
		expect(documentRequests).toEqual([]);
	};
}

test.describe("Theme toggle", () => {
	test("switches foundry and foundry-dark, stores the choice and survives a reload", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		await expect(page.locator("html")).toHaveAttribute("data-theme", "foundry");
		await expect(themeToggle(page)).toHaveAccessibleName("Dark Mode");

		await themeToggle(page).click();
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			"foundry-dark",
		);
		expect(await storedTheme(page, "quiet-theme")).toBe("foundry-dark");
		await expect(themeToggle(page)).toHaveAccessibleName("Light Mode");

		await themeToggle(page).click();
		await expect(page.locator("html")).toHaveAttribute("data-theme", "foundry");
		expect(await storedTheme(page, "quiet-theme")).toBe("foundry");
		await expect(themeToggle(page)).toHaveAccessibleName("Dark Mode");

		await themeToggle(page).click();
		await page.reload();
		await page.waitForLoadState("networkidle");
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			"foundry-dark",
		);
		await expect(themeToggle(page)).toHaveAccessibleName("Light Mode");
	});

	test("QuietRoot wrapper and toast region follow the theme", async ({
		page,
	}) => {
		await page.goto("/");
		await themeToggle(page).click();

		await expect(page.locator("div[data-quiet][data-theme]")).toHaveAttribute(
			"data-theme",
			"foundry-dark",
		);
		await expect(
			page.getByRole("region", { name: "Notifications", exact: true }),
		).toHaveAttribute("data-theme", "foundry-dark");
	});
});

const protoMigrationCases = [
	{
		label: "proto carbon maps to foundry-dark",
		seed: { "proto-theme": "carbon" },
		html: "foundry-dark",
		quiet: "foundry-dark",
		protoCleared: true,
	},
	{
		label: "proto paper maps to foundry",
		seed: { "proto-theme": "paper" },
		html: "foundry",
		quiet: "foundry",
		protoCleared: true,
	},
	{
		label: "any other proto value maps to foundry",
		seed: { "proto-theme": "midnight" },
		html: "foundry",
		quiet: "foundry",
		protoCleared: true,
	},
	{
		label: "an existing quiet choice wins over proto",
		seed: { "proto-theme": "paper", "quiet-theme": "foundry-dark" },
		html: "foundry-dark",
		quiet: "foundry-dark",
		protoCleared: true,
	},
	{
		label: "neither key set leaves quiet-theme unset",
		seed: {},
		html: "foundry",
		quiet: null,
		protoCleared: false,
	},
] as const;

test.describe("Proto theme migration", () => {
	for (const tc of protoMigrationCases) {
		test(tc.label, async ({ page }) => {
			await seedStorage(page, tc.seed);
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			await expect(page.locator("html")).toHaveAttribute("data-theme", tc.html);
			expect(await storedTheme(page, "quiet-theme")).toBe(tc.quiet);
			if (tc.protoCleared) {
				expect(await storedTheme(page, "proto-theme")).toBeNull();
			}
		});
	}
});

// /billing/pay is skipped: Stripe.js is loaded from the network.
const routes = [
	{ path: "/" },
	{ path: "/calendar" },
	{ path: "/posts" },
	{ path: "/posts/new" },
	{ path: "/posts/post_2", draftDetails: true },
	{ path: "/posts/post_1/analytics" },
	{ path: "/media" },
	{ path: "/blog" },
	{ path: "/blog/new" },
	{ path: `/blog/${fullBlogPost.id}` },
	{ path: "/analytics" },
	{ path: "/github" },
	{ path: `/github/${githubCommit.id}` },
	{ path: "/admin" },
	{ path: "/account" },
	{ path: "/billing" },
	{ path: "/billing/plans" },
	{ path: "/billing/payment_attempt?session_id=cs_test" },
	{ path: "/help" },
] as const;

const themes = ["foundry", "foundry-dark"] as const;

test.describe("Every route renders in both themes", () => {
	for (const route of routes) {
		for (const theme of themes) {
			test(`${route.path} renders in ${theme}`, async ({ page, network }) => {
				if ("draftDetails" in route) {
					network.use(
						http.get("*/api/protected/posts/:id/details", () =>
							HttpResponse.json({
								post: posts[1],
								platform_posts: [],
								media: null,
							}),
						),
					);
				}
				const pageErrors: string[] = [];
				page.on("pageerror", (error) => pageErrors.push(error.message));
				await seedStorage(page, { "quiet-theme": theme });

				await page.goto(route.path);
				await page.waitForLoadState("networkidle");

				await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
				await expect(
					page.locator("div[data-quiet][data-theme]"),
				).toHaveAttribute("data-theme", theme);
				await expect(page.getByRole("main")).toHaveCount(1);
				await expect(page.getByRole("main")).toBeVisible();
				expect(pageErrors).toEqual([]);
			});
		}
	}
});

test.describe("Mobile drawer (390x844)", () => {
	test.use({ viewport: MOBILE });

	test("trigger opens the drawer and a nav link navigates and closes it", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const drawer = page.getByRole("dialog", { name: "Main" });
		// quiet keeps the drawer mounted while closed, so it is hidden, not absent.
		await expect(drawer).toBeHidden();
		await expect(sidebarNav(page)).toBeHidden();
		await expect(
			page.getByRole("button", { name: "Open navigation" }),
		).toBeVisible();

		await page.getByRole("button", { name: "Open navigation" }).click();
		await expect(drawer).toBeVisible();
		await expect(drawer.getByRole("link", { name: "Settings" })).toBeVisible();
		await expect(
			drawer.getByRole("button", { name: "Close navigation" }),
		).toBeVisible();

		await drawer.getByRole("link", { name: "Settings" }).click();
		await expect(page).toHaveURL(/\/account$/);
		await expect(drawer).toBeHidden();
	});

	test("Close navigation and Escape close it; Escape returns focus to the trigger", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		const trigger = page.getByRole("button", { name: "Open navigation" });
		const drawer = page.getByRole("dialog", { name: "Main" });

		await trigger.click();
		await expect(drawer).toBeVisible();
		await drawer.getByRole("button", { name: "Close navigation" }).click();
		await expect(drawer).toBeHidden();
		await expect(page).toHaveURL(/\/$/);

		await trigger.click();
		await expect(drawer).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(drawer).toBeHidden();
		await expect(trigger).toBeFocused();
	});
});

test.describe("Sidebar", () => {
	test("desktop shows the named sidebar without a drawer trigger", async ({
		page,
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		const nav = sidebarNav(page);
		await expect(nav).toBeVisible();
		for (const name of [
			"Calendar",
			"Posts",
			"Media",
			"Blog",
			"Settings",
			"Help",
		]) {
			await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
		}
		await expect(
			nav.getByRole("button", { name: /^(dark|light) mode$/i }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Open navigation" }),
		).toHaveCount(0);
		await expect(themeToggle(page)).not.toHaveAttribute("aria-current");
	});

	test("Analytics and GitHub are visible for the default persona (content_creator)", async ({
		page,
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		await expect(
			sidebarNav(page).getByRole("link", { name: "Analytics", exact: true }),
		).toBeVisible();
		await expect(
			sidebarNav(page).getByRole("link", { name: "GitHub", exact: true }),
		).toBeVisible();
	});

	for (const persona of ["marketing", "admin"] as const) {
		test(`Analytics and GitHub are visible for the ${persona} persona`, async ({
			page,
			network,
		}) => {
			network.use(scenarios.auth.withPersona(persona));
			await page.setViewportSize(DESKTOP);
			await page.goto("/");
			await page.waitForLoadState("networkidle");
			await expect(
				sidebarNav(page).getByRole("link", { name: "Analytics", exact: true }),
			).toBeVisible();
			await expect(
				sidebarNav(page).getByRole("link", { name: "GitHub", exact: true }),
			).toBeVisible();
		});
	}

	test("link click routes without a full page load and the current item follows the route", async ({
		page,
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto("/posts");
		await page.waitForLoadState("networkidle");
		const assertClientNavigation = await trackClientNavigation(page);

		const nav = sidebarNav(page);
		const posts = nav.getByRole("link", { name: "Posts", exact: true });
		const settings = nav.getByRole("link", { name: "Settings", exact: true });
		await expect(posts).toHaveAttribute("aria-current", "page");

		await settings.click();

		await expect(page).toHaveURL(/\/account$/);
		await expect(page.getByRole("main")).toBeVisible();
		await assertClientNavigation();
		await expect(settings).toHaveAttribute("aria-current", "page");
		await expect(posts).not.toHaveAttribute("aria-current", "page");

		await themeToggle(page).click();
		await expect(themeToggle(page)).not.toHaveAttribute("aria-current");
		await expect(settings).toHaveAttribute("aria-current", "page");
	});
});

test.describe("Help", () => {
	test("the sidebar Help link routes without a full page load and gets aria-current", async ({
		page,
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		const assertClientNavigation = await trackClientNavigation(page);

		const helpLink = sidebarNav(page).getByRole("link", {
			name: "Help",
			exact: true,
		});
		await helpLink.click();

		await expect(page).toHaveURL(/\/help$/);
		await expect(
			page.getByRole("heading", { level: 1, name: "Help", exact: true }),
		).toBeVisible();
		await assertClientNavigation();
		await expect(helpLink).toHaveAttribute("aria-current", "page");
	});
});

test.describe("Topbar", () => {
	test("breadcrumb route keeps its single h1 inside main; breadcrumb on desktop, back link on mobile routes without a full page load", async ({
		page,
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto("/posts/new");
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
		await expect(
			page.getByRole("main").getByRole("heading", { level: 1 }),
		).toHaveCount(1);
		await expect(
			page.getByRole("navigation", { name: "Breadcrumb: New" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Back to Posts" })).toHaveCount(
			0,
		);

		await page.setViewportSize(MOBILE);
		await page.reload();
		await page.waitForLoadState("networkidle");
		const assertClientNavigation = await trackClientNavigation(page);

		await expect(
			page.getByRole("link", { name: "Back to Posts" }),
		).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Breadcrumb: New" }),
		).toHaveCount(0);

		await page.getByRole("link", { name: "Back to Posts" }).click();
		await expect(page).toHaveURL(/\/posts$/);
		await assertClientNavigation();
	});

	test("a titled route renders its single h1 in the banner, outside main", async ({
		page,
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto("/posts");
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
		await expect(
			page.getByRole("banner").getByRole("heading", { level: 1 }),
		).toHaveCount(1);
		await expect(
			page.getByRole("main").getByRole("heading", { level: 1 }),
		).toHaveCount(0);
	});
});

test.describe("Landmarks", () => {
	test("one main and one banner holding the h1 on /posts and /account", async ({
		page,
	}) => {
		for (const path of ["/posts", "/account"]) {
			await page.goto(path);
			await page.waitForLoadState("networkidle");

			await expect(page.getByRole("main")).toHaveCount(1);
			await expect(page.getByRole("banner")).toHaveCount(1);
			await expect(
				page.getByRole("banner").getByRole("heading", { level: 1 }),
			).toHaveCount(1);
		}
	});

	test("the impersonation strip is an alert and there is still one banner", async ({
		page,
		network,
	}) => {
		network.use(scenarios.admin.impersonating());
		await page.goto("/posts");
		await page.waitForLoadState("networkidle");

		const strip = page.getByRole("alert").filter({
			has: page.getByRole("button", { name: "Stop impersonating" }),
		});
		await expect(strip).toHaveCount(1);
		await expect(strip).toBeVisible();
		await expect(page.getByRole("banner")).toHaveCount(1);
		await expect(page.getByRole("main")).toHaveCount(1);
	});
});

test.describe("Scroll", () => {
	test.use({ viewport: { width: 1280, height: 300 } });

	test("main scrolls on its own and the banner stays put", async ({ page }) => {
		await page.goto("/posts");
		await page.waitForLoadState("networkidle");

		const banner = page.getByRole("banner");
		const before = await banner.boundingBox();
		await page
			.getByRole("main")
			.evaluate((el) => el.scrollTo(0, el.scrollHeight));
		const after = await banner.boundingBox();

		expect(after).toEqual(before);
		expect(
			await page.evaluate(() => document.scrollingElement?.scrollTop),
		).toBe(0);
	});
});
