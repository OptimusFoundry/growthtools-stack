/**
 * Billing/Subscription API handlers
 */
import { HttpResponse, http } from "msw";
import type { ApiTierName } from "../../src/api/types/tier";
import { setupEndpoint } from "../helpers/endpoint";
import { prices, subscriptions } from "../mocks/data";

export const billingEndpoints = {
	getSubscription: setupEndpoint(
		"GET",
		"*/api/protected/billing/subscription",
		subscriptions.pro,
		{
			overrides: {
				404: { error: "no active subscription found", code: "NOT_FOUND" },
			},
		},
	),
	getPlans: setupEndpoint("GET", "*/api/billing/plans", prices),
	createSubscriptionIntent: setupEndpoint(
		"POST",
		"*/api/protected/billing/create-subscription-intent",
		{ client_secret: "pi_test_secret_123" },
		{
			successStatus: 200,
			overrides: {
				409: {
					error:
						"You already have an active subscription. Use billing portal to change plans.",
					code: "SUBSCRIPTION_EXISTS",
				},
			},
		},
	),
	getCheckoutSession: setupEndpoint(
		"GET",
		"*/api/protected/billing/checkout-session",
		{ client_secret: "cs_test_secret_123" },
	),
	cancelSubscription: setupEndpoint(
		"POST",
		"*/api/protected/billing/cancel-subscription",
		{ message: "Subscription cancelled successfully" },
		{
			successStatus: 200,
			overrides: {
				404: { error: "no active subscription found", code: "NOT_FOUND" },
				409: { error: "Subscription already cancelled", code: "CONFLICT" },
			},
		},
	),
	createCustomerPortal: setupEndpoint(
		"POST",
		"*/api/protected/billing/create-customer-portal",
		{ url: "https://billing.stripe.com/session/test_portal_123" },
		{ successStatus: 200 },
	),
	paymentMethodUpdateIntent: setupEndpoint(
		"POST",
		"*/api/protected/billing/payment-method-update-intent",
		{ client_secret: "seti_test_secret_123" },
		{ successStatus: 200 },
	),
};

export const billingHandlers = Object.values(billingEndpoints).map((e) =>
	e[200](),
);

// ── Semantic scenario variants ─────────────────────────────────────────────

export const billingScenarios = {
	/** Free tier — no active subscription (404). */
	noSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json(
				{ error: "no active subscription found" },
				{ status: 404 },
			),
		),

	/** Active pro subscription (200). */
	proSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json(subscriptions.pro),
		),

	/** Active team subscription (200). */
	teamSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json(subscriptions.team),
		),

	/** Cancelled subscription (200 — status = "canceled"). */
	cancelledSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ ...subscriptions.pro, status: "canceled" }),
		),

	/** Past-due subscription (200 — status = "past_due"). */
	pastDueSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ ...subscriptions.pro, status: "past_due" }),
		),

	/** Trialing subscription (200 — status = "trialing"). */
	trialingSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ ...subscriptions.pro, status: "trialing" }),
		),
};

/**
 * Returns the subscription handler appropriate for a given tier.
 * Convenience for cross-feature tests that need to set a billing context.
 */
export const getBillingHandlersForTier = (tier: ApiTierName) => {
	if (tier === "free") return [billingScenarios.noSubscription()];
	if (tier === "team") return [billingScenarios.teamSubscription()];
	return [billingScenarios.proSubscription()];
};
