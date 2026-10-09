import { Badge } from "@optimusfoundry/quiet";
import { Crown, type LucideIcon, User, Users } from "lucide-react";
import { type HTMLAttributes, memo } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { useTier } from "@/contexts/tier";
import type { TierName } from "@/types/tier";

// ============================================================================
// Types
// ============================================================================

export interface TierBadgeProps extends HTMLAttributes<HTMLSpanElement> {
	/** Override the tier to display (defaults to current user's tier) */
	tier?: TierName;
	/** Additional CSS class */
	className?: string;
}

// ============================================================================
// Tier Icons
// ============================================================================

const TIER_ICONS: Record<TierName, LucideIcon> = {
	free: User,
	pro: Crown,
	team: Users,
};

// Badge has no tinted variants, so tiers differ by weight rather than hue.
const TIER_VARIANTS: Record<TierName, "secondary" | "outline" | "primary"> = {
	free: "secondary",
	pro: "outline",
	team: "primary",
};

// ============================================================================
// Component
// ============================================================================

/**
 * TierBadge component
 *
 * Displays the current tier as a badge.
 *
 * @example
 * ```tsx
 * // Shows current user's tier
 * <TierBadge />
 *
 * // Shows specific tier
 * <TierBadge tier="pro" />
 * ```
 */
export const TierBadge = memo(function TierBadge({
	tier: tierOverride,
	className,
	...props
}: TierBadgeProps) {
	const { tier } = useTier();

	const displayTier = tierOverride ?? tier.tierName;
	const displayName = tierOverride
		? displayTier.charAt(0).toUpperCase() + displayTier.slice(1)
		: tier.displayName;

	const icon = TIER_ICONS[displayTier] ?? TIER_ICONS.free;

	return (
		<span className={className} {...props}>
			<Badge
				variant={TIER_VARIANTS[displayTier] ?? TIER_VARIANTS.free}
				size="sm"
				leftIcon={<AppIcon icon={icon} size="sm" />}
			>
				{displayName}
			</Badge>
		</span>
	);
});

TierBadge.displayName = "TierBadge";
