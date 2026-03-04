/**
 * Tier Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) tier types
 */

import type { TierInfo } from "@/types/tier";
import type { ApiTierInfo } from "../types/tier";

// ============================================================================
// API → UI Transformers
// ============================================================================

export function toUiTierInfo(api: ApiTierInfo): TierInfo {
	return {
		tierName: api.tier_name,
		displayName: api.display_name,
		priceDescription: api.price_description,
		features: api.features,
		limits: api.limits,
	};
}
