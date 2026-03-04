import { memo, type ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Banner } from "@/proto-design-system/components/feedback/Banner";
import { LinkButton } from "@/proto-design-system/components/primitives/Button";
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface GatedEmptyStateProps {
	/** Feature key to check access for */
	feature: string;
	/** Icon to display in the empty state */
	icon: ReactNode;
	/** Title for the empty state */
	title: string;
	/** Description for the empty state */
	description: string;
	/** Optional custom banner title (defaults to "{TierName} Feature") */
	bannerTitle?: string;
	/** Optional custom banner description */
	bannerDescription?: string;
	/** Content to render when user has access to the feature */
	children?: ReactNode;
	/** Additional CSS class */
	className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * GatedEmptyState component
 *
 * Shows a feature-gated empty state with a banner and upgrade CTA when
 * the user doesn't have access to a feature. If the user has access,
 * renders the children (or nothing if no children provided).
 *
 * @example
 * ```tsx
 * // As a full-page gate
 * <GatedEmptyState
 *   feature="email_blasts"
 *   icon={<Send />}
 *   title="Email Blasts"
 *   description="Send targeted emails to your audience segments."
 * />
 *
 * // With children to render when user has access
 * <GatedEmptyState
 *   feature="email_blasts"
 *   icon={<Send />}
 *   title="Email Blasts"
 *   description="Send targeted emails to your audience segments."
 * >
 *   <BlastsList />
 * </GatedEmptyState>
 * ```
 */
export const GatedEmptyState = memo(function GatedEmptyState({
	feature,
	icon,
	title,
	description,
	bannerTitle,
	bannerDescription,
	children,
	className,
}: GatedEmptyStateProps) {
	const { hasAccess, requiredTierDisplayName } = useFeatureAccess(feature);

	// If user has access, render children or nothing
	if (hasAccess) {
		return children ? <>{children}</> : null;
	}

	// Build banner content with dynamic tier name
	const resolvedBannerTitle =
		bannerTitle ?? `${requiredTierDisplayName} Feature`;
	const resolvedBannerDescription =
		bannerDescription ??
		`Upgrade to ${requiredTierDisplayName} to access this feature.`;

	// Build empty state description with tier info
	const fullDescription = `${description} This feature is available on the ${requiredTierDisplayName} plan.`;

	return (
		<div className={`${styles.root} ${className ?? ""}`}>
			<Banner
				type="feature"
				variant="lighter"
				title={resolvedBannerTitle}
				description={resolvedBannerDescription}
				action={<a href="/billing/plans">Upgrade</a>}
				dismissible={false}
			/>
			<EmptyState
				icon={icon}
				title={title}
				description={fullDescription}
				action={
					<LinkButton variant="primary" href="/billing/plans">
						Upgrade to {requiredTierDisplayName}
					</LinkButton>
				}
			/>
		</div>
	);
});

GatedEmptyState.displayName = "GatedEmptyState";
