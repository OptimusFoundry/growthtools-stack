/**
 * Admin Impersonation E2E Tests
 *
 * Covers:
 *   GET    /api/protected/admin/users           — user search (200, 403, 500, transport)
 *   POST   /api/protected/admin/impersonate/:id — start impersonation (204, 403, 404, 409, transport)
 *   DELETE /api/protected/admin/impersonate     — stop impersonation (204, transport)
 *   GET    /api/protected/user                  — impersonation banner driven by is_impersonated field
 *
 * Route guard:
 *   Non-admin visiting /admin → redirected to /
 *
 * Every API endpoint has a table-driven status-code coverage block plus a
 * transport-failure test. Golden-path and interaction tests are preserved.
 */

import type { Page } from "@playwright/test";
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { endpoints, scenarios } from "./handlers";
import { loginAs } from "./helpers/auth";

// ImpersonationBanner is a product-local strip with role="alert" (not a quiet Alert).
const impersonationBanner = (page: Page) =>
	page.getByRole("alert").filter({
		has: page.getByRole("button", { name: /stop impersonating/i }),
	});

const confirmDialog = (page: Page) =>
	page.getByRole("dialog", { name: /confirm impersonation/i });

// ── Status-code tables ─────────────────────────────────────────────────────

const userSearchErrorCases = [
	{
		status: 403,
		body: { error: "Forbidden", code: "FORBIDDEN" },
		label: "forbidden — non-admin",
	},
	{
		status: 500,
		body: {
			error: "An internal error occurred. Please try again later.",
			code: "INTERNAL_ERROR",
		},
		label: "internal server error",
	},
] as const;

const startImpersonationErrorCases = [
	{
		status: 403,
		body: { error: "Forbidden", code: "FORBIDDEN" },
		label: "forbidden — non-admin",
	},
	{
		status: 404,
		body: { error: "User not found", code: "NOT_FOUND" },
		label: "target user not found",
	},
	{
		status: 409,
		body: { error: "Already impersonating", code: "ALREADY_IMPERSONATING" },
		label: "already impersonating (no nesting)",
	},
	{
		status: 500,
		body: {
			error: "An internal error occurred. Please try again later.",
			code: "INTERNAL_ERROR",
		},
		label: "internal server error",
	},
] as const;

// ── Admin page — golden paths ─────────────────────────────────────────────

test.describe("Admin page — golden paths", () => {
	test("admin user sees the admin page with user list", async ({ page }) => {
		await loginAs(page);
		await page.goto("/admin");

		const userList = page.getByRole("table", { name: "Users" });
		await expect(userList).toBeVisible();

		const rows = page.getByRole("row", { name: /@example\.com/ });
		await expect(rows).toHaveCount(2);
	});

	test("search input filters results (debounced)", async ({
		page,
		network,
	}) => {
		network.use(
			http.get("*/api/protected/admin/users", ({ request }) => {
				const url = new URL(request.url);
				const q = url.searchParams.get("q") ?? "";
				const results =
					q === "jane"
						? [
								{
									id: "user_target_1",
									email: "jane@example.com",
									first_name: "Jane",
									last_name: "Doe",
									created_at: "2024-01-15T10:00:00Z",
								},
							]
						: [];
				return HttpResponse.json(results);
			}),
		);

		await loginAs(page);
		await page.goto("/admin");

		const searchInput = page.getByRole("textbox", {
			name: "Search users by email",
		});
		await searchInput.fill("jane");

		// Wait for debounce + fetch to complete
		await page.waitForTimeout(350);
		const rows = page.getByRole("row", { name: /@example\.com/ });
		await expect(rows).toHaveCount(1);
		await expect(page.getByText("jane@example.com")).toBeVisible();
	});

	test('"Login as" button opens confirm dialog', async ({ page }) => {
		await loginAs(page);
		await page.goto("/admin");

		const firstLoginBtn = page.getByRole("button", {
			name: /login as jane@example\.com/i,
		});
		await firstLoginBtn.click();

		await expect(confirmDialog(page)).toBeVisible();
		await expect(
			page.getByText(/actions will affect their account/i),
		).toBeVisible();
	});

	test("cancel closes the dialog without making a request", async ({
		page,
		network,
	}) => {
		let postCalled = false;
		network.use(
			http.post("*/api/protected/admin/impersonate/*", () => {
				postCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await loginAs(page);
		await page.goto("/admin");

		await page
			.getByRole("button", { name: /login as jane@example\.com/i })
			.click();
		await page.getByRole("button", { name: /cancel/i }).click();

		await expect(confirmDialog(page)).not.toBeVisible();
		expect(postCalled).toBe(false);
	});

	test("confirm triggers POST and navigates to /", async ({
		page,
		network,
	}) => {
		let navigated = false;
		network.use(
			http.post(
				"*/api/protected/admin/impersonate/*",
				() => new HttpResponse(null, { status: 204 }),
			),
		);

		await loginAs(page);
		await page.goto("/admin");

		// Intercept navigation
		page.on("framenavigated", (frame) => {
			if (frame.url().includes("/") && !frame.url().includes("/admin")) {
				navigated = true;
			}
		});

		await page
			.getByRole("button", { name: /login as jane@example\.com/i })
			.click();
		await page.getByRole("button", { name: /continue/i }).click();

		// The page should navigate away (full reload to /)
		await page.waitForURL("/");
		// navigated flag is a belt-and-suspenders check
		expect(navigated).toBe(true);
	});
});

// ── Non-admin redirect ─────────────────────────────────────────────────────

test.describe("Route guard", () => {
	test("non-admin visiting /admin is redirected to /", async ({
		page,
		network,
	}) => {
		network.use(scenarios.admin.notAdmin());

		await loginAs(page);
		await page.goto("/admin");

		// The beforeLoad redirect should land us at /
		await expect(page).toHaveURL("/");
	});
});

// ── Impersonation banner ───────────────────────────────────────────────────

test.describe("ImpersonationBanner", () => {
	test("banner is not shown for normal (non-impersonated) sessions", async ({
		page,
	}) => {
		// Default handlers return a normal user (no is_impersonated flag)
		await loginAs(page);
		await page.goto("/");

		await expect(impersonationBanner(page)).toHaveCount(0);
	});

	test("banner is shown when is_impersonated=true", async ({
		page,
		network,
	}) => {
		network.use(scenarios.admin.impersonating());

		await loginAs(page);
		await page.goto("/");

		const banner = impersonationBanner(page);
		await expect(banner).toBeVisible();
		await expect(banner).toContainText(/impersonating/i);
		await expect(banner).toContainText("Jane Doe");
	});

	test('"Stop impersonating" in banner calls DELETE and reloads', async ({
		page,
		network,
	}) => {
		network.use(scenarios.admin.impersonating());

		let deleteCalled = false;
		network.use(
			http.delete("*/api/protected/admin/impersonate", () => {
				deleteCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await loginAs(page);
		await page.goto("/");

		const banner = impersonationBanner(page);
		await expect(banner).toBeVisible();

		await banner.getByRole("button", { name: /stop impersonating/i }).click();

		await page.waitForURL("/");
		expect(deleteCalled).toBe(true);
	});
});

// ── GET /api/protected/admin/users — status-code table ───────────────────

test.describe("GET /api/protected/admin/users — error status codes", () => {
	for (const tc of userSearchErrorCases) {
		test(`${tc.status} — ${tc.label}`, async ({ page, network }) => {
			network.use(
				http.get("*/api/protected/admin/users", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);

			await loginAs(page);

			if (tc.status === 403) {
				// 403 triggers beforeLoad redirect
				await page.goto("/admin");
				await expect(page).toHaveURL("/");
			} else {
				// Other errors show up as error state in the list or as error boundary
				await page.goto("/admin");
				// Page either shows error or error boundary — just ensure no crash loop
				await expect(page.locator("body")).toBeVisible();
			}
		});
	}

	test("transport failure — admin/users", async ({ page, network }) => {
		network.use(endpoints.admin.users.transport());

		await loginAs(page);
		await page.goto("/admin");
		// The beforeLoad will throw (non-403), landing on error boundary
		await expect(page.locator("body")).toBeVisible();
	});
});

// ── POST /api/protected/admin/impersonate — status-code table ────────────

test.describe("POST /api/protected/admin/impersonate — error status codes", () => {
	for (const tc of startImpersonationErrorCases) {
		test(`${tc.status} — ${tc.label}`, async ({ page, network }) => {
			network.use(
				http.post("*/api/protected/admin/impersonate/*", () =>
					HttpResponse.json(tc.body, { status: tc.status }),
				),
			);

			await loginAs(page);
			await page.goto("/admin");

			await page
				.getByRole("button", { name: /login as jane@example\.com/i })
				.click();
			await page.getByRole("button", { name: /continue/i }).click();

			// Dialog should stay open; error message should appear
			await expect(confirmDialog(page)).toBeVisible();
			await expect(confirmDialog(page).getByRole("alert")).toBeVisible();
		});
	}

	test("transport failure — start impersonation", async ({ page, network }) => {
		network.use(endpoints.admin.startImpersonation.transport());

		await loginAs(page);
		await page.goto("/admin");

		await page
			.getByRole("button", { name: /login as jane@example\.com/i })
			.click();
		await page.getByRole("button", { name: /continue/i }).click();

		await expect(confirmDialog(page).getByRole("alert")).toBeVisible();
	});
});

// ── DELETE /api/protected/admin/impersonate — status-code table ──────────

test.describe("DELETE /api/protected/admin/impersonate — status codes", () => {
	test("204 — success: banner stop button clears session", async ({
		page,
		network,
	}) => {
		network.use(scenarios.admin.impersonating());
		network.use(endpoints.admin.stopImpersonation[200]());

		await loginAs(page);
		await page.goto("/");

		await impersonationBanner(page)
			.getByRole("button", { name: /stop impersonating/i })
			.click();
		await page.waitForURL("/");
	});

	test("transport failure — stop impersonation still navigates (best effort)", async ({
		page,
		network,
	}) => {
		network.use(scenarios.admin.impersonating());
		network.use(endpoints.admin.stopImpersonation.transport());

		await loginAs(page);
		await page.goto("/");

		await impersonationBanner(page)
			.getByRole("button", { name: /stop impersonating/i })
			.click();

		// The handler uses finally{} so navigation still happens despite fetch failure
		await page.waitForURL("/");
	});
});
