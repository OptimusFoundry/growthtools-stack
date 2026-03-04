import { Crown, type LucideIcon, User, Users } from "lucide-react";
import { type HTMLAttributes, memo } from "react";
import { useTier } from "@/contexts/tier";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import type { TierName } from "@/types/tier";
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface TierBadgeProps extends HTMLAttributes<HTMLSpanElement> {
	/** Override the tier to display (defaults to current user's tier) */
	tier?: TierName;
	/** Size variant */
	size?: "small" | "medium";
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
 * <TierBadge tier="pro" size="small" />
 * ```
 */
export const TierBadge = memo(function TierBadge({
	tier: tierOverride,
	size = "medium",
	className: customClassName,
	...props
}: TierBadgeProps) {
	const { tier } = useTier();

	const displayTier = tierOverride ?? tier.tierName;
	const displayName = tierOverride
		? displayTier.charAt(0).toUpperCase() + displayTier.slice(1)
		: tier.displayName;

	const icon = TIER_ICONS[displayTier] ?? TIER_ICONS.free;

	const classNames = [
		styles.root,
		styles[`tier_${displayTier}`],
		styles[`size_${size}`],
		customClassName,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<span className={classNames} {...props}>
			<Icon icon={icon} size="sm" className={styles.icon} />
			<span className={styles.label}>{displayName}</span>
		</span>
	);
});

TierBadge.displayName = "TierBadge";
