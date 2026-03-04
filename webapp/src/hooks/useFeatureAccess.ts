import { useMemo } from "react";
import { getRequiredTierForFeature, getTierDisplayName } from "@/config/tiers";
import { useTier } from "@/contexts/tier";
import type { TierName } from "@/types/tier";

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseFeatureAccessResult {
	hasAccess: boolean;
	requiredTier: TierName;
	requiredTierDisplayName: string;
	currentTier: TierName;
	currentTierDisplayName: string;
	needsUpgrade: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useFeatureAccess(feature: string): UseFeatureAccessResult {
	const { tier, hasFeature } = useTier();

	return useMemo(() => {
		const hasAccess = hasFeature(feature);
		const requiredTier = getRequiredTierForFeature(feature);
		const requiredTierDisplayName = getTierDisplayName(requiredTier);
		const currentTierDisplayName = tier.displayName;

		return {
			hasAccess,
			requiredTier,
			requiredTierDisplayName,
			currentTier: tier.tierName,
			currentTierDisplayName,
			needsUpgrade: !hasAccess,
		};
	}, [feature, hasFeature, tier.tierName, tier.displayName]);
}

// ============================================================================
// Convenience Hooks
// ============================================================================

export function useCanUseAIChat() {
	return useFeatureAccess("ai_content_generation");
}

export function useCanUseAnalytics() {
	return useFeatureAccess("analytics");
}

export function useCanUseBlog() {
	return useFeatureAccess("blog");
}

export function useCanUseScheduling() {
	return useFeatureAccess("scheduling");
}

export function useCanUseGitHubIntegration() {
	return useFeatureAccess("github_integration");
}

export function useCanRemoveBranding() {
	return useFeatureAccess("remove_branding");
}
