import { type HTMLAttributes, memo, type ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface FeatureGateProps extends HTMLAttributes<HTMLDivElement> {
	/** Feature key to check access for */
	feature: string;
	/** Content to render when feature is available */
	children: ReactNode;
	/** Content to render when feature is not available (defaults to null) */
	fallback?: ReactNode;
	/** Additional CSS class */
	className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * FeatureGateHidden component
 *
 * Hides content entirely when the user doesn't have access to a feature.
 * This is the "hidden" variant - use when you want to completely hide the UI.
 *
 * Conditionally renders content based on feature availability.
 * If the user has access to the feature, renders children.
 * Otherwise, renders the fallback content (or nothing).
 *
 * For the alternative behavior (disabled state with lock badge), see FeatureGate.
 *
 * @example
 * ```tsx
 * // Simple gate - hide if no access
 * <FeatureGateHidden feature="email_blasts">
 *   <EmailBlastEditor />
 * </FeatureGateHidden>
 *
 * // With fallback upgrade prompt
 * <FeatureGateHidden
 *   feature="webhooks_zapier"
 *   fallback={<UpgradePrompt feature="webhooks_zapier" />}
 * >
 *   <WebhooksManager />
 * </FeatureGateHidden>
 * ```
 */
export const FeatureGateHidden = memo(function FeatureGateHidden({
	feature,
	children,
	fallback = null,
	className: customClassName,
	...props
}: FeatureGateProps) {
	const { hasAccess } = useFeatureAccess(feature);

	if (!hasAccess) {
		if (!fallback) return null;

		return (
			<div className={customClassName} {...props}>
				{fallback}
			</div>
		);
	}

	return (
		<div className={customClassName} {...props}>
			{children}
		</div>
	);
});

FeatureGateHidden.displayName = "FeatureGateHidden";

// ============================================================================
// Disabled Wrapper Variant
// ============================================================================

export interface FeatureGateDisabledProps extends FeatureGateProps {
	/** Message to show on hover when disabled */
	disabledMessage?: string;
}

/**
 * FeatureGateDisabled component
 *
 * Renders content in a disabled state when feature is not available.
 * Shows a tooltip with upgrade message on hover.
 *
 * @example
 * ```tsx
 * <FeatureGateDisabled
 *   feature="tracking_pixels"
 *   disabledMessage="Upgrade to Team to use tracking pixels"
 * >
 *   <TrackingPixelSection />
 * </FeatureGateDisabled>
 * ```
 */
export const FeatureGateDisabled = memo(function FeatureGateDisabled({
	feature,
	children,
	disabledMessage,
	className: customClassName,
	...props
}: FeatureGateDisabledProps) {
	const { hasAccess, requiredTierDisplayName } = useFeatureAccess(feature);

	const classNames = [
		styles.root,
		!hasAccess && styles.disabled,
		customClassName,
	]
		.filter(Boolean)
		.join(" ");

	const message =
		disabledMessage ?? `Upgrade to ${requiredTierDisplayName} to unlock`;

	return (
		<div
			className={classNames}
			title={!hasAccess ? message : undefined}
			aria-disabled={!hasAccess}
			{...props}
		>
			{children}
		</div>
	);
});

FeatureGateDisabled.displayName = "FeatureGateDisabled";
