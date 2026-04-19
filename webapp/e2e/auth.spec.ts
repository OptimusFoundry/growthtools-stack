/**
 * Auth E2E Tests
 *
 * Covers:
 *   - POST /api/auth/test/login  (test-login page UI)
 *   - GET  /api/protected/user   (session / user-info used by root layout)
 *
 * Every endpoint has a table-driven status-code coverage block plus a
 * transport-failure (HttpResponse.error()) test.
 * Golden-path and interaction tests are preserved.
 */

import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { scenarios } from "./handlers";
import { loginAs } from "./helpers/auth";

// ── Helpers ────────────────────────────────────────────────────────────────

async function fillAndSubmitTestLogin(page: Parameters<typeof loginAs>[0]) {
	await page.getByTestId("test-login-email").fill("user@example.com");
	await page.getByTestId("test-login-password").fill("hunter2hunter2");
	await page.getByTestId("test-login-submit").click();
}

// ── Status-code tables ─────────────────────────────────────────────────────

/**
 * POST /api/auth/test/login
 *
 * Backend handleError switch produces:
 *   400 — ShouldBindJSON validation failure  (apierrors.ValidationError)
 *   401 — ErrIncorrectPassword               (apierrors.Unauthorized → "Invalid email or password")
 *   500 — unexpected processor error         (apierrors.InternalError)
 */
const testLoginErrorCases = [
	{
		status: 400,
		body: { error: "invalid input" },
		label: "bad request / validation",
		expect: /invalid|required|bad/i,
	},
	{
		status: 401,
		body: { error: "Invalid email or password" },
		label: "invalid credentials",
		expect: /invalid email or password/i,
	},
	{
		status: 500,
		body: { error: "Internal server error" },
		label: "server error",
		expect: /internal server error|error|failed/i,
	},
] as const;

// ── Test-Login page — golden paths ─────────────────────────────────────────

test.describe("Test Login — golden paths", () => {
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
			page.getByRole("heading", {
				name: /good (morning|afternoon|evening).*command center/i,
			}),
		).toBeVisible();
	});

	test("submit button shows loading state while request is in-flight", async ({
		page,
		network,
	}) => {
		// Delay the response so we can observe the intermediate state
		network.use(
			http.post("*/api/auth/test/login", async () => {
				await new Promise((r) => setTimeout(r, 300));
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await page.goto("/test-login");
		await page.getByTestId("test-login-email").fill("user@example.com");
		await page.getByTestId("test-login-password").fill("hunter2hunter2");
		await page.getByTestId("test-login-submit").click();

		await expect(page.getByTestId("test-login-submit")).toBeDisabled();
		await expect(page.getByTestId("test-login-submit")).toHaveText(
			/signing in/i,
		);
	});

	test("no error alert is shown on initial page load", async ({ page }) => {
		await page.goto("/test-login");
		await expect(page.getByRole("alert")).not.toBeVisible();
	});
});

// ── POST /api/auth/test/login — Status Code Coverage ──────────────────────

test.describe("POST /api/auth/test/login — status code coverage", () => {
	for (const tc of testLoginErrorCases) {
		test(`handles ${tc.status} — ${tc.label}`, async ({ network, page }) => {
			network.use(
				http.post("*/api/auth/test/login", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);

			await page.goto("/test-login");
			await fillAndSubmitTestLogin(page);

			const alert = page.getByRole("alert");
			await expect(alert).toBeVisible();
			await expect(alert).toHaveText(tc.expect);

			// Must stay on /test-login — no redirect on error
			await expect(page).toHaveURL(/\/test-login$/);
		});
	}

	test("handles transport failure (network error)", async ({
		network,
		page,
	}) => {
		network.use(http.post("*/api/auth/test/login", () => HttpResponse.error()));

		await page.goto("/test-login");
		await fillAndSubmitTestLogin(page);

		const alert = page.getByRole("alert");
		await expect(alert).toBeVisible();
		// The fetcher re-throws the TypeError from fetch; the page renders err.message
		await expect(alert).toHaveText(/failed to fetch|network|login failed/i);

		await expect(page).toHaveURL(/\/test-login$/);
	});

	test("submit button re-enables after a failed request", async ({
		network,
		page,
	}) => {
		network.use(
			http.post("*/api/auth/test/login", () =>
				HttpResponse.json(
					{ error: "Invalid email or password" },
					{ status: 401 },
				),
			),
		);

		await page.goto("/test-login");
		await fillAndSubmitTestLogin(page);

		await expect(page.getByRole("alert")).toBeVisible();
		await expect(page.getByTestId("test-login-submit")).toBeEnabled();
	});
});

// ── GET /api/protected/user — Status Code Coverage ────────────────────────

test.describe("GET /api/protected/user — status code coverage", () => {
	test("handles 401 — expired / missing session — redirects away from protected route", async ({
		network,
		page,
	}) => {
		network.use(
			http.get("*/api/protected/user", () =>
				HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
			),
		);

		// Attempt to access a protected page
		await page.goto("/");

		// App should redirect to signin when user fetch returns 401
		await expect(page).toHaveURL(/\/signin|\/test-login/);
	});

	test("handles 401 — session expired scenario factory", async ({
		network,
		page,
	}) => {
		network.use(scenarios.auth.sessionExpired());

		await page.goto("/");

		await expect(page).toHaveURL(/\/signin|\/test-login/);
	});

	test("handles 500 — server error — stays on page or shows error UI", async ({
		network,
		page,
	}) => {
		network.use(
			http.get("*/api/protected/user", () =>
				HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
			),
		);

		await page.goto("/");

		// App may redirect to signin or show an error; it must not crash blank
		const bodyText = await page.locator("body").innerText();
		expect(bodyText).toMatch(/./); // page has rendered some content
	});

	test("handles transport failure (network error)", async ({
		network,
		page,
	}) => {
		network.use(http.get("*/api/protected/user", () => HttpResponse.error()));

		await page.goto("/");

		// On total network failure the app should not render a blank page
		const bodyText = await page.locator("body").innerText();
		expect(bodyText).toMatch(/./);
	});

	test("200 — authenticated user — renders welcome heading on dashboard", async ({
		page,
	}) => {
		// Default handlers already return a Pro tier user
		await loginAs(page);

		await expect(
			page.getByRole("heading", {
				name: /good (morning|afternoon|evening).*command center/i,
			}),
		).toBeVisible();
	});
});

// ── Existing scenario-factory smoke tests ─────────────────────────────────

test.describe("Auth scenario factories", () => {
	test("testLoginFailed scenario surfaces error alert", async ({
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

	test("unauthenticated scenario redirects from protected route", async ({
		network,
		page,
	}) => {
		network.use(scenarios.auth.unauthenticated());

		await page.goto("/");

		await expect(page).toHaveURL(/\/signin|\/test-login/);
	});
});
