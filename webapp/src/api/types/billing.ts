/**
 * Billing API Types
 *
 * API request/response types for billing and subscriptions (snake_case)
 */

// ============================================================================
// Price/Product Types
// ============================================================================

export interface ApiPrice {
	product_id: string;
	price_id: string;
	description: string;
	unit_amount: number | null;
	currency: string | null;
	interval: string | null;
}

export type ApiPriceResponse = ApiPrice[];

// ============================================================================
// Subscription Types
// ============================================================================

export interface ApiSubscription {
	id: string;
	status: string;
	price_id: string;
	start_date: string;
	end_date: string;
	next_billing_date: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ApiCancelSubscriptionResponse {
	message: string;
}

export interface ApiPaymentMethodUpdateIntentResponse {
	client_secret: string;
}

export interface ApiCustomerPortalResponse {
	url: string;
}

export interface ApiCheckoutSessionResponse {
	client_secret: string;
}
