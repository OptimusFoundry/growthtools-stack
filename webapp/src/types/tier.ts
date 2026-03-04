/**
 * Tier UI Type Definitions
 *
 * UI types (camelCase) for tier/subscription features
 */

// ============================================================================
// Tier Types
// ============================================================================

export type TierName = "free" | "pro" | "team";

export type TierFeatures = Record<string, boolean>;

export type TierLimits = Record<string, number | null>;

export interface TierInfo {
	tierName: TierName;
	displayName: string;
	priceDescription: string;
	features: TierFeatures;
	limits: TierLimits;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_TIER_FEATURES: TierFeatures = {
	platform_connections: true,
	ai_content_generation: false,
	scheduling: false,
	analytics: false,
	blog: false,
	media_library: true,
	github_integration: false,
	remove_branding: false,
};

export const DEFAULT_TIER_LIMITS: TierLimits = {
	posts_per_month: 10,
	platforms: 2,
	media_storage_mb: 100,
	team_members: 1,
};

export const DEFAULT_TIER_INFO: TierInfo = {
	tierName: "free",
	displayName: "Free",
	priceDescription: "free",
	features: DEFAULT_TIER_FEATURES,
	limits: DEFAULT_TIER_LIMITS,
};
