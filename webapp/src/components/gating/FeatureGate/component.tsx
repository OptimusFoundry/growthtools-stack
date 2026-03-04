/**
 * FeatureGate Component
 * Wraps features that require a higher tier plan, showing an inline badge with tier name
 */

import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { type HTMLAttributes, memo, type ReactNode, useCallback } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

export interface FeatureGateProps extends HTMLAttributes<HTMLDivElement> {
	/** Feature key to check access for */
	feature: string;
	/** Children to render (will be disabled if no access) */
	children: ReactNode;
	/** Additional CSS class */
	className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * FeatureGate wraps content that requires a specific feature.
 * If the user doesn't have access, it shows the content disabled with an inline Pro badge.
 *
 * @example
 * ```tsx
 * <FeatureGate feature="email_verification">
 *   <CheckboxWithLabel ... />
 * </FeatureGate>
 * ```
 */
export const FeatureGate = memo(function FeatureGate({
	feature,
	children,
	className: customClassName,
	...props
}: FeatureGateProps) {
	const navigate = useNavigate();
	const { hasAccess, requiredTierDisplayName } = useFeatureAccess(feature);

	const handleBadgeClick = useCallback(() => {
		navigate({ to: "/billing/plans" });
	}, [navigate]);

	// If user has access, render children normally
	if (hasAccess) {
		return <>{children}</>;
	}

	const classNames = [styles.root, customClassName].filter(Boolean).join(" ");

	return (
		<div className={classNames} {...props}>
			<div className={styles.lockedContent}>{children}</div>
			<button
				type="button"
				className={styles.badge}
				onClick={handleBadgeClick}
				title={`Upgrade to ${requiredTierDisplayName}`}
			>
				<Icon icon={Lock} size="sm" />
				<span>{requiredTierDisplayName}</span>
			</button>
		</div>
	);
});

FeatureGate.displayName = "FeatureGate";
