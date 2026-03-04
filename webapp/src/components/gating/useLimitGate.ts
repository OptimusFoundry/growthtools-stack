/**
 * useLimitGate Hook
 * Manages state and logic for limit-based feature gating
 */

import { useCallback, useEffect, useState } from "react";
import { useTier } from "@/contexts/tier";

// ============================================================================
// Types
// ============================================================================

export interface UseLimitGateOptions {
	/** The limit key to check (e.g., "campaigns", "leads", "team_members") */
	limitKey: string;
	/** Current count of the resource */
	currentCount: number;
	/** Auto-show modal when at limit (useful for direct URL access) */
	autoShow?: boolean;
}

export interface UseLimitGateResult {
	/** Whether the user has reached their limit */
	isAtLimit: boolean;
	/** Whether the upgrade modal is currently shown */
	showModal: boolean;
	/** Open the upgrade modal */
	openModal: () => void;
	/** Close the upgrade modal */
	closeModal: () => void;
	/** Check limit and open modal if at limit. Returns true if blocked. */
	checkAndBlock: () => boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing limit-based feature gating
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { isAtLimit, showModal, openModal, closeModal } = useLimitGate({
 *   limitKey: "campaigns",
 *   currentCount: campaigns.length,
 * });
 *
 * // With auto-show for direct URL access
 * const { isAtLimit, showModal, closeModal } = useLimitGate({
 *   limitKey: "campaigns",
 *   currentCount: campaigns.length,
 *   autoShow: true,
 * });
 *
 * // Using checkAndBlock in handlers
 * const handleCreate = () => {
 *   if (checkAndBlock()) return;
 *   navigate({ to: "/campaigns/new" });
 * };
 * ```
 */
export function useLimitGate({
	limitKey,
	currentCount,
	autoShow = false,
}: UseLimitGateOptions): UseLimitGateResult {
	const { getLimit } = useTier();
	const limit = getLimit(limitKey);
	const isAtLimit = limit !== null && currentCount >= limit;

	const [showModal, setShowModal] = useState(false);

	const openModal = useCallback(() => {
		setShowModal(true);
	}, []);

	const closeModal = useCallback(() => {
		setShowModal(false);
	}, []);

	const checkAndBlock = useCallback(() => {
		if (isAtLimit) {
			setShowModal(true);
			return true;
		}
		return false;
	}, [isAtLimit]);

	// Auto-show modal when at limit (for direct URL access)
	useEffect(() => {
		if (autoShow && isAtLimit) {
			setShowModal(true);
		}
	}, [autoShow, isAtLimit]);

	return {
		isAtLimit,
		showModal,
		openModal,
		closeModal,
		checkAndBlock,
	};
}
