// Shared Playwright login helper. Drives the hidden /test-login page.

import type { Browser, BrowserContext, Page } from "playwright";

export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

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

/**
 * Logs in through /test-login in a temporary context (no video), captures
 * the resulting cookies + localStorage as a StorageState, and throws the
 * context away. Callers then open a *recording* context seeded with this
 * state so the video starts at the post-login landing page — the login
 * keystrokes and redirect never make it onto camera.
 */
export async function captureLoginStorageState(
	browser: Browser,
	input: LoginInput,
): Promise<StorageState> {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	try {
		const page = await context.newPage();
		await loginAs(page, input);
		return await context.storageState();
	} finally {
		await context.close();
	}
}
