import React, { createContext, useCallback, useContext, useMemo } from "react";
import {
	DEFAULT_TIER_INFO,
	type TierFeatures,
	type TierInfo,
	type TierLimits,
} from "@/types/tier";
import { useAuth } from "./auth";

// ============================================================================
// Context Types
// ============================================================================

interface TierContextType {
	/** Current tier information */
	tier: TierInfo;
	/** Check if a feature is available */
	hasFeature: (feature: string) => boolean;
	/** Get a limit value (null = unlimited) */
	getLimit: (limit: string) => number | null;
	/** Check if at a specific tier or higher */
	isAtLeast: (tierName: "free" | "pro" | "team") => boolean;
	/** All features */
	features: TierFeatures;
	/** All limits */
	limits: TierLimits;
}

// ============================================================================
// Tier Hierarchy
// ============================================================================

const TIER_HIERARCHY = {
	free: 0,
	pro: 1,
	team: 2,
} as const;

// ============================================================================
// Context
// ============================================================================

const TierContext = createContext<TierContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function TierProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();

	// Get tier from user or use default
	const tier = useMemo<TierInfo>(() => {
		if (user?.tier) {
			return user.tier;
		}
		return DEFAULT_TIER_INFO;
	}, [user?.tier]);

	// Check if feature is available
	const hasFeature = useCallback(
		(feature: string): boolean => {
			return tier.features[feature] ?? false;
		},
		[tier.features],
	);

	// Get limit value
	const getLimit = useCallback(
		(limit: string): number | null => {
			return tier.limits[limit] ?? null;
		},
		[tier.limits],
	);

	// Check if at a specific tier or higher
	const isAtLeast = useCallback(
		(tierName: "free" | "pro" | "team"): boolean => {
			const currentLevel = TIER_HIERARCHY[tier.tierName] ?? 0;
			const requiredLevel = TIER_HIERARCHY[tierName] ?? 0;
			return currentLevel >= requiredLevel;
		},
		[tier.tierName],
	);

	const value = useMemo<TierContextType>(
		() => ({
			tier,
			hasFeature,
			getLimit,
			isAtLeast,
			features: tier.features,
			limits: tier.limits,
		}),
		[tier, hasFeature, getLimit, isAtLeast],
	);

	return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTier(): TierContextType {
	const context = useContext(TierContext);
	if (!context) {
		throw new Error("useTier must be used within a TierProvider");
	}
	return context;
}
