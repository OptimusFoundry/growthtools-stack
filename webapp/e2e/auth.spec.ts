/**
 * Auth E2E Tests
 *
 * Exercises the hidden /test-login page and the loginAs helper.
 */
import { expect, test } from "./fixtures/test";
import { scenarios } from "./handlers";
import { loginAs } from "./helpers/auth";

test.describe("Test Login", () => {
	test("loginAs helper drives the form and redirects home", async ({
		page,
	}) => {
		await loginAs(page);
		await expect(page).toHaveURL("/");
	});

	test("manual flow lands on dashboard after submit", async ({ page }) => {
		await page.goto("/test-login");
		await page.getByTestId("test-login-email").fill("user@example.com");
		await page.getByTestId("test-login-password").fill("hunter2hunter2");
		await page.getByTestId("test-login-submit").click();
		await page.waitForURL("/");

		await expect(
			page.getByRole("heading", { name: /welcome back/i }),
		).toBeVisible();
	});

	test("surfaces error when credentials are rejected", async ({
		network,
		page,
	}) => {
		network.use(scenarios.auth.testLoginFailed());

		await page.goto("/test-login");
		await page.getByTestId("test-login-email").fill("bad@example.com");
		await page.getByTestId("test-login-password").fill("wrongpassword");
		await page.getByTestId("test-login-submit").click();

		await expect(page.getByRole("alert")).toHaveText(
			/invalid email or password/i,
		);
		await expect(page).toHaveURL(/\/test-login$/);
	});
});
