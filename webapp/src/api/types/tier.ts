/**
 * Tier API Types
 *
 * API request/response types for tier/subscription features (snake_case)
 */

// ============================================================================
// Tier Types (API Response)
// ============================================================================

export type ApiTierName = "free" | "pro" | "team";

export type ApiTierFeatures = Record<string, boolean>;

export type ApiTierLimits = Record<string, number | null>;

export interface ApiTierInfo {
	tier_name: ApiTierName;
	display_name: string;
	price_description: string;
	features: ApiTierFeatures;
	limits: ApiTierLimits;
}
