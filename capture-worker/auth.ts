// Shared Playwright login helper. Drives the hidden /test-login page.

import type { Page } from "playwright";

export interface LoginInput {
	appUrl: string;
	email: string;
	password: string;
	/** Defaults to "/test-login". */
	testLoginPath?: string;
	/** Path the app redirects to on success. Defaults to "/". */
	postLoginPath?: string;
}

export async function loginAs(page: Page, input: LoginInput): Promise<void> {
	const {
		appUrl,
		email,
		password,
		testLoginPath = "/test-login",
		postLoginPath = "/",
	} = input;

	await page.goto(`${appUrl}${testLoginPath}`, { waitUntil: "networkidle" });
	await page.getByTestId("test-login-email").fill(email);
	await page.getByTestId("test-login-password").fill(password);
	await page.getByTestId("test-login-submit").click();
	await page.waitForURL(`${appUrl}${postLoginPath}`, { timeout: 15000 });
}
