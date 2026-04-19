/**
 * Billing/Subscription API handlers
 *
 * Default handlers return happy-path responses (Pro tier, active subscription).
 * Named scenario factories cover every non-2xx code the backend can emit.
 *
 * Backend handleError mapping:
 *   ErrNoActiveSubscription      → 404
 *   ErrSubscriptionAlreadyExists → 409
 *   default                      → 500
 *
 * Explicit apierrors calls:
 *   apierrors.ValidationError → 400  (create-subscription-intent, binding fail)
 *   apierrors.BadRequest      → 400  (checkout-session, missing session_id)
 *   Auth middleware           → 401  (all protected routes)
 */
import { HttpResponse, http } from "msw";
import type { ApiTierName } from "../../src/api/types/tier";
import { prices, subscriptions } from "../mocks/data";

// ============================================================================
// Default handlers — happy path
// ============================================================================

export const billingHandlers = [
	// GET  /api/protected/billing/subscription
	http.get("*/api/protected/billing/subscription", () =>
		HttpResponse.json(subscriptions.pro),
	),

	// GET  /api/billing/plans  (public)
	http.get("*/api/billing/plans", () => HttpResponse.json(prices)),

	// POST /api/protected/billing/create-subscription-intent
	http.post("*/api/protected/billing/create-subscription-intent", () =>
		HttpResponse.json({ client_secret: "pi_test_secret_123" }),
	),

	// GET  /api/protected/billing/checkout-session
	http.get("*/api/protected/billing/checkout-session", () =>
		HttpResponse.json({ client_secret: "cs_test_secret_123" }),
	),

	// POST /api/protected/billing/cancel-subscription
	http.post("*/api/protected/billing/cancel-subscription", () =>
		HttpResponse.json({ message: "Subscription cancelled successfully" }),
	),

	// POST /api/protected/billing/create-customer-portal
	http.post("*/api/protected/billing/create-customer-portal", () =>
		HttpResponse.json({
			url: "https://billing.stripe.com/session/test_portal_123",
		}),
	),

	// POST /api/protected/billing/payment-method-update-intent
	http.post("*/api/protected/billing/payment-method-update-intent", () =>
		HttpResponse.json({ client_secret: "seti_test_secret_123" }),
	),
];

// ============================================================================
// Scenario factories — subscription state variants
// ============================================================================

export const billingScenarios = {
	// ---------------------------------------------------------------------------
	// GET /api/protected/billing/subscription — state variants
	// ---------------------------------------------------------------------------

	/** Free tier — no active subscription (404) */
	noSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json(
				{ error: "no active subscription found" },
				{ status: 404 },
			),
		),

	/** Active pro subscription (200) */
	proSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json(subscriptions.pro),
		),

	/** Active team subscription (200) */
	teamSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json(subscriptions.team),
		),

	/** Cancelled subscription (200 — status field = "canceled") */
	cancelledSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ ...subscriptions.pro, status: "canceled" }),
		),

	/** Past-due subscription (200 — status field = "past_due") */
	pastDueSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ ...subscriptions.pro, status: "past_due" }),
		),

	/** Trialing subscription (200 — status field = "trialing") */
	trialingSubscription: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ ...subscriptions.pro, status: "trialing" }),
		),

	// ---------------------------------------------------------------------------
	// GET /api/protected/billing/subscription — error codes
	// ---------------------------------------------------------------------------

	/** 401 — auth middleware rejects unauthenticated request */
	subscriptionUnauthorized: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** 500 — unexpected server error */
	subscriptionServerError: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	subscriptionNetworkError: () =>
		http.get("*/api/protected/billing/subscription", () =>
			HttpResponse.error(),
		),

	// ---------------------------------------------------------------------------
	// GET /api/billing/plans — error codes
	// ---------------------------------------------------------------------------

	/** 500 — plans endpoint server error */
	plansServerError: () =>
		http.get("*/api/billing/plans", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	plansNetworkError: () =>
		http.get("*/api/billing/plans", () => HttpResponse.error()),

	// ---------------------------------------------------------------------------
	// POST /api/protected/billing/create-subscription-intent — error codes
	// ---------------------------------------------------------------------------

	/** 400 — binding / validation error (apierrors.ValidationError) */
	createIntentValidationError: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () =>
			HttpResponse.json(
				{ error: "validation failed: price_id is required" },
				{ status: 400 },
			),
		),

	/** 401 — unauthenticated */
	createIntentUnauthorized: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** 402 — payment method declined (Stripe) */
	createIntentPaymentDeclined: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () =>
			HttpResponse.json({ error: "Payment method declined" }, { status: 402 }),
		),

	/** 409 — ErrSubscriptionAlreadyExists */
	createIntentSubscriptionExists: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () =>
			HttpResponse.json(
				{
					error: "SUBSCRIPTION_EXISTS",
					message:
						"You already have an active subscription. Use billing portal to change plans.",
				},
				{ status: 409 },
			),
		),

	/** 500 — server error */
	createIntentServerError: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	createIntentNetworkError: () =>
		http.post("*/api/protected/billing/create-subscription-intent", () =>
			HttpResponse.error(),
		),

	// ---------------------------------------------------------------------------
	// GET /api/protected/billing/checkout-session — error codes
	// ---------------------------------------------------------------------------

	/** 400 — missing session_id query param (apierrors.BadRequest) */
	checkoutSessionBadRequest: () =>
		http.get("*/api/protected/billing/checkout-session", () =>
			HttpResponse.json(
				{ error: "INVALID_INPUT", message: "session_id is required" },
				{ status: 400 },
			),
		),

	/** 401 — unauthenticated */
	checkoutSessionUnauthorized: () =>
		http.get("*/api/protected/billing/checkout-session", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** 404 — session not found (ErrNoActiveSubscription path) */
	checkoutSessionNotFound: () =>
		http.get("*/api/protected/billing/checkout-session", () =>
			HttpResponse.json({ error: "session not found" }, { status: 404 }),
		),

	/** 410 — session expired */
	checkoutSessionExpired: () =>
		http.get("*/api/protected/billing/checkout-session", () =>
			HttpResponse.json({ error: "Session expired" }, { status: 410 }),
		),

	/** 500 — server error */
	checkoutSessionServerError: () =>
		http.get("*/api/protected/billing/checkout-session", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	checkoutSessionNetworkError: () =>
		http.get("*/api/protected/billing/checkout-session", () =>
			HttpResponse.error(),
		),

	// ---------------------------------------------------------------------------
	// POST /api/protected/billing/cancel-subscription — error codes
	// ---------------------------------------------------------------------------

	/** 400 — pending invoices prevent cancellation */
	cancelSubscriptionPendingInvoices: () =>
		http.post("*/api/protected/billing/cancel-subscription", () =>
			HttpResponse.json(
				{ error: "Cannot cancel with pending invoices" },
				{ status: 400 },
			),
		),

	/** 401 — unauthenticated */
	cancelSubscriptionUnauthorized: () =>
		http.post("*/api/protected/billing/cancel-subscription", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** 404 — no active subscription (ErrNoActiveSubscription) */
	cancelSubscriptionNotFound: () =>
		http.post("*/api/protected/billing/cancel-subscription", () =>
			HttpResponse.json(
				{ error: "no active subscription found" },
				{ status: 404 },
			),
		),

	/** 409 — already cancelled (ErrSubscriptionAlreadyExists path) */
	cancelSubscriptionAlreadyCancelled: () =>
		http.post("*/api/protected/billing/cancel-subscription", () =>
			HttpResponse.json(
				{ error: "Subscription already cancelled" },
				{ status: 409 },
			),
		),

	/** 500 — server error */
	cancelSubscriptionServerError: () =>
		http.post("*/api/protected/billing/cancel-subscription", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	cancelSubscriptionNetworkError: () =>
		http.post("*/api/protected/billing/cancel-subscription", () =>
			HttpResponse.error(),
		),

	// ---------------------------------------------------------------------------
	// POST /api/protected/billing/create-customer-portal — error codes
	// ---------------------------------------------------------------------------

	/** 401 — unauthenticated */
	customerPortalUnauthorized: () =>
		http.post("*/api/protected/billing/create-customer-portal", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** 500 — server error */
	customerPortalServerError: () =>
		http.post("*/api/protected/billing/create-customer-portal", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	customerPortalNetworkError: () =>
		http.post("*/api/protected/billing/create-customer-portal", () =>
			HttpResponse.error(),
		),

	// ---------------------------------------------------------------------------
	// POST /api/protected/billing/payment-method-update-intent — error codes
	// ---------------------------------------------------------------------------

	/** 400 — bad request body */
	paymentMethodUpdateBadRequest: () =>
		http.post("*/api/protected/billing/payment-method-update-intent", () =>
			HttpResponse.json({ error: "Invalid request body" }, { status: 400 }),
		),

	/** 401 — unauthenticated */
	paymentMethodUpdateUnauthorized: () =>
		http.post("*/api/protected/billing/payment-method-update-intent", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** 500 — server error */
	paymentMethodUpdateServerError: () =>
		http.post("*/api/protected/billing/payment-method-update-intent", () =>
			HttpResponse.json({ error: "internal server error" }, { status: 500 }),
		),

	/** Transport failure */
	paymentMethodUpdateNetworkError: () =>
		http.post("*/api/protected/billing/payment-method-update-intent", () =>
			HttpResponse.error(),
		),
};

// ============================================================================
// Tier helper
// ============================================================================

/**
 * Returns the subscription handler appropriate for a given tier.
 * Convenience for cross-feature tests that need to set a billing context.
 */
export const getBillingHandlersForTier = (tier: ApiTierName) => {
	if (tier === "free") return [billingScenarios.noSubscription()];
	if (tier === "team") return [billingScenarios.teamSubscription()];
	return [billingScenarios.proSubscription()];
};
