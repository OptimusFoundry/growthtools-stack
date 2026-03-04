import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { type HTMLAttributes, memo } from "react";
import { FEATURE_DISPLAY_CONFIGS } from "@/config/tiers";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface UpgradePromptProps extends HTMLAttributes<HTMLDivElement> {
	/** Feature that requires upgrade */
	feature: string;
	/** Optional title override */
	title?: string;
	/** Optional description override */
	description?: string;
	/** Visual variant */
	variant?: "inline" | "card" | "banner";
	/** Additional CSS class */
	className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * UpgradePrompt component
 *
 * Shows an upgrade CTA when a feature requires a higher tier.
 *
 * @example
 * ```tsx
 * <UpgradePrompt feature="email_blasts" />
 *
 * <UpgradePrompt
 *   feature="webhooks_zapier"
 *   variant="banner"
 *   title="Unlock Integrations"
 * />
 * ```
 */
export const UpgradePrompt = memo(function UpgradePrompt({
	feature,
	title,
	description,
	variant = "card",
	className: customClassName,
	...props
}: UpgradePromptProps) {
	const navigate = useNavigate();
	const { requiredTierDisplayName, currentTierDisplayName, hasAccess } =
		useFeatureAccess(feature);

	// Don't render if user already has access
	if (hasAccess) return null;

	// Get feature display info
	const featureConfig = FEATURE_DISPLAY_CONFIGS.find((f) => f.key === feature);
	const featureName = featureConfig?.name ?? feature;
	const featureDescription = featureConfig?.description ?? "";

	const displayTitle = title ?? `Upgrade to ${requiredTierDisplayName}`;
	const displayDescription =
		description ??
		`${featureName} is available on the ${requiredTierDisplayName} plan. ${featureDescription}`;

	const classNames = [
		styles.root,
		styles[`variant_${variant}`],
		customClassName,
	]
		.filter(Boolean)
		.join(" ");

	const handleUpgradeClick = () => {
		navigate({ to: "/billing/plans" });
	};

	return (
		<div className={classNames} {...props}>
			<div className={styles.icon}>
				<Icon icon={Lock} size="lg" />
			</div>
			<div className={styles.content}>
				<h4 className={styles.title}>{displayTitle}</h4>
				<p className={styles.description}>{displayDescription}</p>
			</div>
			<Button
				type="button"
				className={styles.upgradeButton}
				onClick={handleUpgradeClick}
			>
				Upgrade to {requiredTierDisplayName}
			</Button>
			<span className={styles.currentTier}>
				Current plan: {currentTierDisplayName}
			</span>
		</div>
	);
});

UpgradePrompt.displayName = "UpgradePrompt";
