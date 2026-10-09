/**
 * Help E2E Tests
 *
 * Tests for the static /help route: landmarks, sidebar and drawer navigation,
 * the single-open FAQ accordion and the contact link. The page makes no API
 * calls of its own, so there are no status-code tables.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/test";

const MOBILE = { width: 390, height: 844 };

const sidebarNav = (page: Page) =>
	page.getByRole("navigation", { name: "Main" });

const faqRegion = (page: Page) =>
	page.getByRole("region", { name: "Frequently asked questions" });

const faqTriggers = (page: Page) => faqRegion(page).getByRole("button");

type MarkedWindow = { __marker?: string };

test.describe("Help page", () => {
	test("a direct load renders the page", async ({ page }) => {
		await page.goto("/help");
		await page.waitForLoadState("networkidle");

		await expect(page).toHaveURL(/\/help$/);
		await expect(page.getByRole("main")).toBeVisible();
		await expect(
			page.getByRole("heading", { level: 1, name: "Help", exact: true }),
		).toBeVisible();
	});

	test("renders exactly one h1 'Help' and one main", async ({ page }) => {
		await page.goto("/help");
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help");
		await expect(page.getByRole("main")).toHaveCount(1);
	});

	test("the sidebar Help link routes without a full page load and gets aria-current", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		await page.evaluate(() => {
			(window as unknown as MarkedWindow).__marker = "kept";
		});
		const documentRequests: string[] = [];
		page.on("request", (request) => {
			if (request.resourceType() === "document") {
				documentRequests.push(request.url());
			}
		});

		const helpLink = sidebarNav(page).getByRole("link", {
			name: "Help",
			exact: true,
		});
		await expect(helpLink).not.toHaveAttribute("aria-current", "page");
		await helpLink.click();

		await expect(page).toHaveURL(/\/help$/);
		await expect(
			page.getByRole("heading", { level: 1, name: "Help", exact: true }),
		).toBeVisible();
		expect(
			await page.evaluate(() => (window as unknown as MarkedWindow).__marker),
		).toBe("kept");
		expect(documentRequests).toEqual([]);
		await expect(helpLink).toHaveAttribute("aria-current", "page");
	});

	test.describe("FAQ", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/help");
			await page.waitForLoadState("networkidle");
		});

		test("the FAQ region is labelled by its heading and holds six accordion triggers", async ({
			page,
		}) => {
			await expect(
				page.getByRole("heading", {
					level: 2,
					name: "Frequently asked questions",
				}),
			).toBeVisible();
			await expect(faqRegion(page)).toBeVisible();
			await expect(faqTriggers(page)).toHaveCount(6);
			for (const trigger of await faqTriggers(page).all()) {
				await expect(trigger).toHaveAttribute("aria-expanded", "false");
			}
		});

		test("clicking a question toggles aria-expanded", async ({ page }) => {
			const first = faqTriggers(page).first();

			await first.click();
			await expect(first).toHaveAttribute("aria-expanded", "true");

			await first.click();
			await expect(first).toHaveAttribute("aria-expanded", "false");
		});

		test("opening another question closes the first", async ({ page }) => {
			const first = faqTriggers(page).nth(0);
			const second = faqTriggers(page).nth(1);

			await first.click();
			await expect(first).toHaveAttribute("aria-expanded", "true");

			await second.click();
			await expect(second).toHaveAttribute("aria-expanded", "true");
			await expect(first).toHaveAttribute("aria-expanded", "false");
		});
	});

	test("the Email support link is a mailto address", async ({ page }) => {
		await page.goto("/help");
		await page.waitForLoadState("networkidle");

		const email = page.getByRole("link", { name: "Email support" });
		await expect(email).toBeVisible();
		await expect(email).toHaveAttribute("href", /^mailto:.+@.+/);
	});

	test.describe("mobile (390x844)", () => {
		test("the drawer's Help link navigates, closes the drawer and does not overflow", async ({
			page,
		}) => {
			await page.setViewportSize(MOBILE);
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			await page.getByRole("button", { name: "Open navigation" }).click();
			const drawer = page.getByRole("dialog", { name: "Main" });
			await expect(drawer).toBeVisible();

			await drawer.getByRole("link", { name: "Help", exact: true }).click();

			await expect(page).toHaveURL(/\/help$/);
			await expect(drawer).toHaveCount(0);
			await expect(
				page.getByRole("heading", { level: 1, name: "Help", exact: true }),
			).toBeVisible();

			const overflow = await page.evaluate(() => {
				const root = document.documentElement;
				return { scroll: root.scrollWidth, client: root.clientWidth };
			});
			expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
		});
	});
});
