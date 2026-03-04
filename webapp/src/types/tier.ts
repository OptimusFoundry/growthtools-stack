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
	email_verification: false,
	referral_system: false,
	visual_form_builder: true,
	visual_email_builder: false,
	all_widget_types: false,
	remove_branding: false,
	anti_spam_protection: false,
	enhanced_lead_data: false,
	tracking_pixels: false,
	webhooks_zapier: false,
	email_blasts: false,
	json_export: false,
};

export const DEFAULT_TIER_LIMITS: TierLimits = {
	campaigns: 1,
	leads: 200,
	team_members: 1,
};

export const DEFAULT_TIER_INFO: TierInfo = {
	tierName: "free",
	displayName: "Free",
	priceDescription: "free",
	features: DEFAULT_TIER_FEATURES,
	limits: DEFAULT_TIER_LIMITS,
};
