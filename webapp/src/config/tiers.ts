/**
 * Tier Configuration
 *
 * Static tier configuration for display and comparison
 */

import type { TierName } from "@/types/tier";

// ============================================================================
// Tier Display Configuration
// ============================================================================

export interface TierDisplayConfig {
	name: TierName;
	displayName: string;
	description: string;
	highlighted?: boolean;
}

export const TIER_CONFIGS: Record<TierName, TierDisplayConfig> = {
	free: {
		name: "free",
		displayName: "Free",
		description: "Perfect for getting started",
	},
	pro: {
		name: "pro",
		displayName: "Pro",
		description: "For growing businesses",
		highlighted: true,
	},
	team: {
		name: "team",
		displayName: "Team",
		description: "For larger teams and enterprises",
	},
};

// ============================================================================
// Feature Display Configuration
// ============================================================================

export interface FeatureDisplayConfig {
	key: string;
	name: string;
	description: string;
}

export const FEATURE_DISPLAY_CONFIGS: FeatureDisplayConfig[] = [
	{
		key: "email_verification",
		name: "Email Verification",
		description: "Verify user emails before adding to waitlist",
	},
	{
		key: "referral_system",
		name: "Referral System",
		description: "Enable referral tracking and rewards",
	},
	{
		key: "visual_form_builder",
		name: "Visual Form Builder",
		description: "Drag-and-drop form customization",
	},
	{
		key: "visual_email_builder",
		name: "Visual Email Builder",
		description: "Design emails with our visual editor",
	},
	{
		key: "all_widget_types",
		name: "All Widget Types",
		description: "Access to all widget types including advanced options",
	},
	{
		key: "remove_branding",
		name: "Remove Branding",
		description: "Remove platform branding from your forms",
	},
	{
		key: "anti_spam_protection",
		name: "Anti-spam Protection",
		description: "Advanced spam and bot protection",
	},
	{
		key: "enhanced_lead_data",
		name: "Enhanced Lead Data",
		description: "Collect additional lead information",
	},
	{
		key: "tracking_pixels",
		name: "Tracking Pixels",
		description: "Add Facebook, Google, and other tracking pixels",
	},
	{
		key: "webhooks_zapier",
		name: "Webhooks & Zapier",
		description: "Integrate with external services",
	},
	{
		key: "email_blasts",
		name: "Email Blasts",
		description: "Send bulk emails to your waitlist",
	},
	{
		key: "json_export",
		name: "JSON Export",
		description: "Export data in JSON format",
	},
];

// ============================================================================
// Limit Display Configuration
// ============================================================================

export interface LimitDisplayConfig {
	key: string;
	name: string;
	description: string;
	formatValue: (value: number | null) => string;
}

export const LIMIT_DISPLAY_CONFIGS: LimitDisplayConfig[] = [
	{
		key: "campaigns",
		name: "Campaigns",
		description: "Number of waitlist campaigns",
		formatValue: (value) => (value === null ? "Unlimited" : value.toString()),
	},
	{
		key: "leads",
		name: "Leads",
		description: "Maximum leads per campaign",
		formatValue: (value) =>
			value === null ? "Unlimited" : value.toLocaleString(),
	},
	{
		key: "team_members",
		name: "Team Members",
		description: "Number of team members",
		formatValue: (value) => (value === null ? "Unlimited" : value.toString()),
	},
];

// ============================================================================
// Tier Upgrade Paths
// ============================================================================

export const TIER_UPGRADE_PATH: Record<TierName, TierName | null> = {
	free: "pro",
	pro: "team",
	team: null,
};

// ============================================================================
// Feature to Required Tier Mapping
// ============================================================================

export const FEATURE_REQUIRED_TIER: Record<string, TierName> = {
	email_verification: "pro",
	referral_system: "pro",
	visual_form_builder: "free",
	visual_email_builder: "pro",
	all_widget_types: "pro",
	remove_branding: "pro",
	anti_spam_protection: "pro",
	enhanced_lead_data: "pro",
	tracking_pixels: "team",
	webhooks_zapier: "team",
	email_blasts: "team",
	json_export: "pro",
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getTierDisplayName(tierName: TierName): string {
	return TIER_CONFIGS[tierName]?.displayName ?? "Free";
}

export function getRequiredTierForFeature(feature: string): TierName {
	return FEATURE_REQUIRED_TIER[feature] ?? "pro";
}

export function getUpgradeTier(currentTier: TierName): TierName | null {
	return TIER_UPGRADE_PATH[currentTier];
}
