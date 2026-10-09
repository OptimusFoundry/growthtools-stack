/**
 * LimitUpgradeModal Component
 * Modal that displays when a user has reached their plan's limit for a resource
 */

import { Button, Dialog, Stack, Text } from "@optimusfoundry/quiet";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { memo, useCallback } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { useTier } from "@/contexts/tier";

// ============================================================================
// Types
// ============================================================================

export interface LimitUpgradeModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Callback when modal is closed */
	onClose: () => void;
	/** The limit key to check (e.g., "campaigns", "leads", "team_members") */
	limitKey: string;
	/** Display name for the resource (e.g., "campaign", "lead", "team member") */
	resourceName: string;
	/** Optional custom title */
	title?: string;
	/** Optional custom description */
	description?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * LimitUpgradeModal displays an upgrade prompt when users reach their plan limits
 *
 * @example
 * ```tsx
 * <LimitUpgradeModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   limitKey="campaigns"
 *   resourceName="campaign"
 * />
 * ```
 */
export const LimitUpgradeModal = memo(function LimitUpgradeModal({
	isOpen,
	onClose,
	limitKey,
	resourceName,
	title,
	description,
}: LimitUpgradeModalProps) {
	const navigate = useNavigate();
	const { getLimit, tier } = useTier();
	const limit = getLimit(limitKey);

	const handleUpgrade = useCallback(() => {
		onClose();
		navigate({ to: "/billing/plans" });
	}, [onClose, navigate]);

	const displayTitle =
		title ??
		`${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} Limit Reached`;

	const displayDescription =
		description ??
		`Your ${tier.displayName} plan allows up to ${limit} ${resourceName}${limit === 1 ? "" : "s"}. Upgrade to create more ${resourceName}s and unlock additional features.`;

	return (
		<Dialog
			open={isOpen}
			onClose={onClose}
			icon={<AppIcon icon={Sparkles} size="lg" />}
			title={displayTitle}
			actions={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Maybe Later
					</Button>
					<Button variant="primary" size="sm" onClick={handleUpgrade}>
						View Plans
					</Button>
				</>
			}
		>
			<Stack gap="xs">
				<Text color="muted">{displayDescription}</Text>
				<Text>Upgrade to continue using this feature.</Text>
			</Stack>
		</Dialog>
	);
});

LimitUpgradeModal.displayName = "LimitUpgradeModal";
