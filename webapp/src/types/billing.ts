/**
 * Billing UI Type Definitions
 *
 * UI types (camelCase) for billing and subscriptions
 */

// ============================================================================
// Price/Product Types (UI - camelCase)
// ============================================================================

export interface Price {
	productId: string;
	priceId: string;
	description: string;
	unitAmount: number | null;
	currency: string | null;
	interval: string | null;
}

// ============================================================================
// Subscription Types (UI - camelCase)
// ============================================================================

export interface Subscription {
	id: string;
	status: string;
	priceId: string;
	startDate: Date;
	endDate: Date;
	nextBillingDate: Date;
}

// ============================================================================
// Response Types (for convenience)
// ============================================================================

export interface CancelSubscriptionResponse {
	message: string;
}

export interface PaymentMethodUpdateIntentResponse {
	clientSecret: string;
}

export interface CustomerPortalResponse {
	url: string;
}

export interface CheckoutSessionResponse {
	clientSecret: string;
}
