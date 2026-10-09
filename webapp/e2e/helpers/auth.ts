/**
 * Auth helpers for Playwright E2E tests.
 *
 * The webapp has a hidden /test-login page that posts to POST /api/auth/test/login
 * and, against a real backend, causes the server to set the session cookie
 * directly. In MSW-backed tests the POST is intercepted and the mocked
 * /api/protected/user handler is what actually makes the app look authed.
 */

import type { Page } from "@playwright/test";

export interface LoginOptions {
	/** Email for the test user. Defaults to a deterministic fake address. */
	email?: string;
	/** Password for the test user. */
	password?: string;
	/** Path to land on after login. Defaults to "/". */
	redirectTo?: string;
}

/**
 * Drives the /test-login UI to sign in and waits for the post-login redirect.
 * Use this at the start of tests that need an authenticated session.
 */
export async function loginAs(page: Page, options: LoginOptions = {}) {
	const {
		email = "playwright@example.com",
		password = "playwright-password",
		redirectTo = "/",
	} = options;

	await page.goto("/test-login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: /sign(ing)? in/i }).click();
	await page.waitForURL(redirectTo);
}
