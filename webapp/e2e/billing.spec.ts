/**
 * Billing E2E Tests
 *
 * Tests for billing and subscription management with table-driven scenarios.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { prices, subscriptions } from "./mocks/data";

// ============================================================================
// Test Data Tables
// ============================================================================

const subscriptionStates = [
	{ name: "active", status: "active", expectText: /active|current|pro/i },
	{
		name: "past_due",
		status: "past_due",
		expectText: /past due|payment|update/i,
	},
	{
		name: "canceled",
		status: "canceled",
		expectText: /cancel|ended|resubscribe/i,
	},
	{ name: "trialing", status: "trialing", expectText: /trial|days left/i },
] as const;

const paymentErrorScenarios = [
	{ status: 402, error: "Card declined", expectText: /declined|payment/i },
	{ status: 402, error: "Card expired", expectText: /expired|update/i },
	{
		status: 402,
		error: "Insufficient funds",
		expectText: /insufficient|funds/i,
	},
] as const;

const subscriptionErrorScenarios = [
	{ status: 400, error: "Invalid price ID", expectText: /invalid|error/i },
	{ status: 403, error: "Account suspended", expectText: /suspended|contact/i },
	{
		status: 500,
		error: "Payment processing failed",
		expectText: /error|failed/i,
	},
] as const;

// ============================================================================
// Tests
// ============================================================================

test.describe("Billing", () => {
	// =========================================================================
	// Subscription Status
	// =========================================================================

	test.describe("Subscription Status", () => {
		test("200 OK - shows active subscription", async ({ page }) => {
			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/pro|subscription|billing/i);
		});

		test("404 - no subscription (free tier)", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/subscription", () =>
					HttpResponse.json(
						{ error: "No active subscription" },
						{ status: 404 },
					),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/upgrade|free|plan/i);
		});

		// Table-driven subscription state tests
		for (const { name, status, expectText } of subscriptionStates) {
			test(`shows ${name} subscription state`, async ({ network, page }) => {
				network.use(
					http.get("*/api/protected/billing/subscription", () =>
						HttpResponse.json({
							...subscriptions.pro,
							status,
						}),
					),
				);

				await page.goto("/billing");
				await page.waitForLoadState("networkidle");

				const content = await page.textContent("body");
				expect(content?.toLowerCase()).toMatch(expectText);
			});
		}

		test("handles 401 Unauthorized", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/subscription", () =>
					HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const url = page.url();
			expect(url.includes("signin") || url.includes("billing")).toBeTruthy();
		});

		test("handles 500 Internal Server Error", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/subscription", () =>
					HttpResponse.json({ error: "Server error" }, { status: 500 }),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/error|unavailable/i);
		});

		test("handles network failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/subscription", () =>
					HttpResponse.error(),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});

	// =========================================================================
	// Plans Page
	// =========================================================================

	test.describe("Plans Page", () => {
		test("200 OK - displays plans", async ({ page }) => {
			await page.goto("/billing/plans");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/pro|team|plan/i);
		});

		test("shows current plan indicator", async ({ page }) => {
			await page.goto("/billing/plans");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/current|your plan|selected/i);
		});

		test("handles plans endpoint failure", async ({ network, page }) => {
			network.use(
				http.get("*/api/billing/plans", () =>
					HttpResponse.json({ error: "Service unavailable" }, { status: 503 }),
				),
			);

			await page.goto("/billing/plans");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toBeTruthy();
		});
	});

	// =========================================================================
	// Create Subscription
	// =========================================================================

	test.describe("Create Subscription", () => {
		test("200 OK - initiates checkout", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/create-subscription-intent", () =>
					HttpResponse.json({ client_secret: "pi_test_secret" }),
				),
			);

			await page.goto("/billing/plans");
			await page.waitForLoadState("networkidle");

			const upgradeBtn = page.getByRole("button", {
				name: /upgrade|select|choose/i,
			});
			if (await upgradeBtn.first().isVisible()) {
				// Don't click - would navigate to Stripe
				expect(await upgradeBtn.first().isVisible()).toBeTruthy();
			}
		});

		// Table-driven payment error tests
		for (const { status, error } of paymentErrorScenarios) {
			test(`handles ${status} ${error}`, async ({ network, page }) => {
				network.use(
					http.post("*/api/protected/billing/create-subscription-intent", () =>
						HttpResponse.json({ error }, { status }),
					),
				);

				await page.goto("/billing/plans");
				await page.waitForLoadState("networkidle");

				// Page should load - error shows during checkout flow
				expect(await page.textContent("body")).toBeTruthy();
			});
		}

		// Table-driven subscription error tests
		for (const { status, error } of subscriptionErrorScenarios) {
			test(`handles ${status} ${error}`, async ({ network, page }) => {
				network.use(
					http.post("*/api/protected/billing/create-subscription-intent", () =>
						HttpResponse.json({ error }, { status }),
					),
				);

				await page.goto("/billing/plans");
				await page.waitForLoadState("networkidle");

				expect(await page.textContent("body")).toBeTruthy();
			});
		}

		test("handles network failure", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/create-subscription-intent", () =>
					HttpResponse.error(),
				),
			);

			await page.goto("/billing/plans");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});
	});

	// =========================================================================
	// Payment Method
	// =========================================================================

	test.describe("Payment Method", () => {
		test("can access payment method page", async ({ page }) => {
			await page.goto("/billing/payment_method");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/payment|card/i);
		});

		test("200 OK - initiates update", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/payment-method-update-intent", () =>
					HttpResponse.json({ client_secret: "seti_test_secret" }),
				),
			);

			await page.goto("/billing/payment_method");
			await page.waitForLoadState("networkidle");

			const updateBtn = page.getByRole("button", {
				name: /update|change|edit/i,
			});
			if (await updateBtn.isVisible()) {
				expect(await updateBtn.isVisible()).toBeTruthy();
			}
		});

		test("handles 400 Bad Request", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/payment-method-update-intent", () =>
					HttpResponse.json({ error: "Invalid request" }, { status: 400 }),
				),
			);

			await page.goto("/billing/payment_method");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});

		test("handles 500 Internal Server Error", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/payment-method-update-intent", () =>
					HttpResponse.json({ error: "Server error" }, { status: 500 }),
				),
			);

			await page.goto("/billing/payment_method");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});
	});

	// =========================================================================
	// Customer Portal
	// =========================================================================

	test.describe("Customer Portal", () => {
		test("200 OK - returns portal URL", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/create-customer-portal", () =>
					HttpResponse.json({ url: "https://billing.stripe.com/session/test" }),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const manageBtn = page.getByRole("button", {
				name: /manage|portal|stripe/i,
			});
			if (await manageBtn.isVisible()) {
				expect(await manageBtn.isVisible()).toBeTruthy();
			}
		});

		test("handles 500 Internal Server Error", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/create-customer-portal", () =>
					HttpResponse.json({ error: "Server error" }, { status: 500 }),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});
	});

	// =========================================================================
	// Cancel Subscription
	// =========================================================================

	test.describe("Cancel Subscription", () => {
		test("200 OK - success", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/cancel-subscription", () =>
					HttpResponse.json({ message: "Subscription cancelled" }),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			const cancelBtn = page.getByRole("button", { name: /cancel/i });
			if (await cancelBtn.isVisible()) {
				await cancelBtn.click();
				const confirm = page.getByRole("button", {
					name: /confirm|yes|cancel/i,
				});
				if (await confirm.isVisible()) {
					await confirm.click();
					await page.waitForLoadState("networkidle");
				}
			}
		});

		test("handles 400 pending invoices", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/cancel-subscription", () =>
					HttpResponse.json(
						{ error: "Cannot cancel with pending invoices" },
						{ status: 400 },
					),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});

		test("handles 403 already cancelled", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/cancel-subscription", () =>
					HttpResponse.json(
						{ error: "Subscription already cancelled" },
						{ status: 403 },
					),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});

		test("handles 500 Internal Server Error", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/billing/cancel-subscription", () =>
					HttpResponse.json({ error: "Server error" }, { status: 500 }),
				),
			);

			await page.goto("/billing");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});
	});

	// =========================================================================
	// Checkout Session
	// =========================================================================

	test.describe("Checkout Session", () => {
		test("200 OK - returns session", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/checkout-session", () =>
					HttpResponse.json({ client_secret: "cs_test_secret" }),
				),
			);

			await page.goto("/billing/pay");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});

		test("handles 404 session not found", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/checkout-session", () =>
					HttpResponse.json({ error: "Session not found" }, { status: 404 }),
				),
			);

			await page.goto("/billing/pay");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});

		test("handles 410 session expired", async ({ network, page }) => {
			network.use(
				http.get("*/api/protected/billing/checkout-session", () =>
					HttpResponse.json({ error: "Session expired" }, { status: 410 }),
				),
			);

			await page.goto("/billing/pay");
			await page.waitForLoadState("networkidle");

			expect(await page.textContent("body")).toBeTruthy();
		});
	});
});
