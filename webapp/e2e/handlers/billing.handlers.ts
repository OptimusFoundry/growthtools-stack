/**
 * Billing/Subscription API handlers
 */
import { HttpResponse, http } from "msw";
import type { ApiTierName } from "../../src/api/types/tier";
import { prices, subscriptions } from "../mocks/data";

/**
 * Default billing handlers - Pro tier with active subscription
 */
export const billingHandlers = [
	// Get subscription
	http.get("*/api/protected/billing/subscription", () => {
		return HttpResponse.json(subscriptions.pro);
	}),

	// Get all prices (public endpoint)
	http.get("*/api/billing/plans", () => {
		return HttpResponse.json(prices);
	}),

	// Create subscription intent
	http.post("*/api/protected/billing/create-subscription-intent", () => {
		return HttpResponse.json({
			client_secret: "pi_test_secret_123",
		});
	}),

	// Get checkout session
	http.get("*/api/protected/billing/checkout-session", () => {
		return HttpResponse.json({
			client_secret: "cs_test_secret_123",
		});
	}),

	// Cancel subscription
	http.post("*/api/protected/billing/cancel-subscription", () => {
		return HttpResponse.json({
			message: "Subscription cancelled successfully",
		});
	}),

	// Create customer portal
	http.post("*/api/protected/billing/create-customer-portal", () => {
		return HttpResponse.json({
			url: "https://billing.stripe.com/session/test_portal_123",
		});
	}),

	// Payment method update
	http.post("*/api/protected/billing/payment-method-update-intent", () => {
		return HttpResponse.json({
			client_secret: "seti_test_secret_123",
		});
	}),
];

/**
 * Handler factories for different subscription states
 */
export const billingScenarios = {
	/** No subscription (free tier) */
	noSubscription: () =>
		http.get("*/api/protected/billing/subscription", () => {
			return HttpResponse.json(
				{ error: "no active subscription found" },
				{ status: 404 },
			);
		}),

	/** Active pro subscription */
	proSubscription: () =>
		http.get("*/api/protected/billing/subscription", () => {
			return HttpResponse.json(subscriptions.pro);
		}),

	/** Active team subscription */
	teamSubscription: () =>
		http.get("*/api/protected/billing/subscription", () => {
			return HttpResponse.json(subscriptions.team);
		}),

	/** Cancelled subscription */
	cancelledSubscription: () =>
		http.get("*/api/protected/billing/subscription", () => {
			return HttpResponse.json({
				...subscriptions.pro,
				status: "canceled",
			});
		}),

	/** Past due subscription */
	pastDueSubscription: () =>
		http.get("*/api/protected/billing/subscription", () => {
			return HttpResponse.json({
				...subscriptions.pro,
				status: "past_due",
			});
		}),

	/** Payment failed */
	paymentFailed: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () => {
			return HttpResponse.json(
				{ error: "Payment method declined" },
				{ status: 402 },
			);
		}),
};

/**
 * Get handlers for a specific tier
 */
export const getBillingHandlersForTier = (tier: ApiTierName) => {
	if (tier === "free") {
		return [billingScenarios.noSubscription()];
	}
	if (tier === "team") {
		return [billingScenarios.teamSubscription()];
	}
	return [billingScenarios.proSubscription()];
};
