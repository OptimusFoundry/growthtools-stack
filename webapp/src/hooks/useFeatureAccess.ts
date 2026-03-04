import { useMemo } from "react";
import { getRequiredTierForFeature, getTierDisplayName } from "@/config/tiers";
import { useTier } from "@/contexts/tier";
import type { TierName } from "@/types/tier";

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseFeatureAccessResult {
	/** Whether the user has access to this feature */
	hasAccess: boolean;
	/** The tier required to access this feature */
	requiredTier: TierName;
	/** Display name of the required tier */
	requiredTierDisplayName: string;
	/** Current user's tier name */
	currentTier: TierName;
	/** Display name of the current tier */
	currentTierDisplayName: string;
	/** Whether an upgrade is needed */
	needsUpgrade: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to check if a user has access to a specific feature
 *
 * @param feature - The feature key to check
 * @returns Object with access status and tier information
 *
 * @example
 * ```tsx
 * const { hasAccess, requiredTierDisplayName } = useFeatureAccess('email_blasts');
 *
 * if (!hasAccess) {
 *   return <UpgradePrompt feature="email_blasts" requiredTier={requiredTierDisplayName} />;
 * }
 * ```
 */
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

/**
 * Hook to check if user can use email verification
 */
export function useCanUseEmailVerification() {
	return useFeatureAccess("email_verification");
}

/**
 * Hook to check if user can use referral system
 */
export function useCanUseReferralSystem() {
	return useFeatureAccess("referral_system");
}

/**
 * Hook to check if user can use webhooks/Zapier
 */
export function useCanUseWebhooks() {
	return useFeatureAccess("webhooks_zapier");
}

/**
 * Hook to check if user can use email blasts
 */
export function useCanUseEmailBlasts() {
	return useFeatureAccess("email_blasts");
}

/**
 * Hook to check if user can remove branding
 */
export function useCanRemoveBranding() {
	return useFeatureAccess("remove_branding");
}

/**
 * Hook to check if user can use tracking pixels
 */
export function useCanUseTrackingPixels() {
	return useFeatureAccess("tracking_pixels");
}
