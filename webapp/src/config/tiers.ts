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
		description: "For growing creators",
		highlighted: true,
	},
	team: {
		name: "team",
		displayName: "Team",
		description: "For teams and agencies",
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
		key: "platform_connections",
		name: "Platform Connections",
		description: "Connect social media accounts",
	},
	{
		key: "ai_content_generation",
		name: "AI Content Generation",
		description: "Generate posts with Claude AI",
	},
	{
		key: "scheduling",
		name: "Post Scheduling",
		description: "Schedule posts for optimal times",
	},
	{
		key: "analytics",
		name: "Analytics",
		description: "Track engagement and performance",
	},
	{
		key: "blog",
		name: "Blog Engine",
		description: "Create and publish SEO-optimized blog posts",
	},
	{
		key: "media_library",
		name: "Media Library",
		description: "Upload and manage images and videos",
	},
	{
		key: "github_integration",
		name: "GitHub Integration",
		description: "Auto-generate posts from GitHub activity",
	},
	{
		key: "remove_branding",
		name: "Remove Branding",
		description: "Remove Growth Tools branding",
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
		key: "posts_per_month",
		name: "Posts per Month",
		description: "Number of posts you can create per month",
		formatValue: (value) => (value === null ? "Unlimited" : value.toString()),
	},
	{
		key: "platforms",
		name: "Platforms",
		description: "Number of connected social platforms",
		formatValue: (value) => (value === null ? "Unlimited" : value.toString()),
	},
	{
		key: "media_storage_mb",
		name: "Media Storage",
		description: "Storage for images and videos",
		formatValue: (value) =>
			value === null
				? "Unlimited"
				: value >= 1000
					? `${(value / 1000).toFixed(0)} GB`
					: `${value} MB`,
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
	platform_connections: "free",
	ai_content_generation: "pro",
	scheduling: "pro",
	analytics: "pro",
	blog: "pro",
	media_library: "free",
	github_integration: "pro",
	remove_branding: "team",
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
