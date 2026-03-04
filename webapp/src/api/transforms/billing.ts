/**
 * Billing Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) billing types
 */

import type { Price, Subscription } from "@/types/billing";
import type { ApiPrice, ApiSubscription } from "../types/billing";
import { parseDate } from "./base";

// ============================================================================
// API → UI Transformers
// ============================================================================

export function toUiPrice(api: ApiPrice): Price {
	return {
		productId: api.product_id,
		priceId: api.price_id,
		description: api.description,
		unitAmount: api.unit_amount,
		currency: api.currency,
		interval: api.interval,
	};
}

export function toUiPrices(prices: ApiPrice[]): Price[] {
	return prices.map(toUiPrice);
}

export function toUiSubscription(api: ApiSubscription): Subscription {
	return {
		id: api.id,
		status: api.status,
		priceId: api.price_id,
		startDate: parseDate(api.start_date)!,
		endDate: parseDate(api.end_date)!,
		nextBillingDate: parseDate(api.next_billing_date)!,
	};
}
