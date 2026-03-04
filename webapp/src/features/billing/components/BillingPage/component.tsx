/**
 * BillingPage Component
 * Container component for billing and subscription management
 */

import { useNavigate } from "@tanstack/react-router";
import { CreditCard, ExternalLink } from "lucide-react";
import { memo, useCallback, useEffect } from "react";
import { ErrorState } from "@/components/error/error";
import { useCreateCustomerPortal } from "@/hooks/useCreateCustomerPortal";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { useGetCurrentSubscription } from "@/hooks/useGetCurrentSubscription";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import type { Price, Subscription } from "@/types/billing";
import styles from "./component.module.scss";

// ============================================================================
// Types
// ============================================================================

interface SubscriptionWithPlan extends Subscription {
	planName?: string;
}

// ============================================================================
// Custom Hooks
// ============================================================================

/** Hook for subscription data with redirect on no subscription */
function useSubscriptionWithPlan() {
	const navigate = useNavigate();
	const { loading, error, currentSubscription, refetch } =
		useGetCurrentSubscription();
	const { prices, loading: pricesLoading } = useGetAllPrices();

	// Redirect to billing plans if no subscription
	useEffect(() => {
		if (error?.error === "no active subscription found") {
			navigate({ to: "/billing/plans" });
		}
	}, [error, navigate]);

	// Combine subscription with plan name
	const subscriptionWithPlan: SubscriptionWithPlan | undefined =
		currentSubscription
			? {
					...currentSubscription,
					planName: prices?.find(
						(p: Price) => p.priceId === currentSubscription.priceId,
					)?.description,
				}
			: undefined;

	return {
		loading: loading || pricesLoading,
		error,
		subscription: subscriptionWithPlan,
		refetch,
	};
}

/** Hook for billing actions */
function useBillingActions() {
	const navigate = useNavigate();
	const { data: portalData, loading: portalLoading } =
		useCreateCustomerPortal();

	const handleManageSubscription = useCallback(() => {
		if (portalData?.url) {
			window.location.href = portalData.url;
		}
	}, [portalData]);

	const handleChangePlan = useCallback(() => {
		navigate({ to: "/billing/plans" });
	}, [navigate]);

	const handleUpdatePaymentMethod = useCallback(() => {
		navigate({ to: "/billing/payment_method" });
	}, [navigate]);

	return {
		portalLoading,
		portalUrl: portalData?.url,
		handleManageSubscription,
		handleChangePlan,
		handleUpdatePaymentMethod,
	};
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SubscriptionCardProps {
	subscription: SubscriptionWithPlan;
}

/** Current subscription card */
const SubscriptionCard = memo(function SubscriptionCard({
	subscription,
}: SubscriptionCardProps) {
	const statusVariant =
		subscription.status === "active"
			? "success"
			: subscription.status === "canceled"
				? "warning"
				: "secondary";

	return (
		<section className={styles.section}>
			<h3 className={styles.sectionTitle}>Current Plan</h3>
			<div className={styles.card}>
				<div className={styles.planHeader}>
					<span className={styles.planName}>
						{subscription.planName || "Unknown Plan"}
					</span>
					<Badge variant={statusVariant} size="md">
						{subscription.status}
					</Badge>
				</div>
				{subscription.status === "active" && subscription.nextBillingDate && (
					<p className={styles.billingDate}>
						Next billing date:{" "}
						{new Date(subscription.nextBillingDate).toLocaleDateString()}
					</p>
				)}
				{subscription.status === "canceled" && (
					<p className={styles.canceledNote}>
						Your subscription will remain active until the end of the current
						billing period.
					</p>
				)}
			</div>
		</section>
	);
});

SubscriptionCard.displayName = "SubscriptionCard";

interface BillingActionsProps {
	status: string;
	portalUrl?: string;
	portalLoading: boolean;
	onManage: () => void;
	onChangePlan: () => void;
	onUpdatePayment: () => void;
}

/** Billing action buttons */
const BillingActions = memo(function BillingActions({
	status,
	portalUrl,
	portalLoading,
	onManage,
	onChangePlan,
	onUpdatePayment,
}: BillingActionsProps) {
	return (
		<section className={styles.section}>
			<h3 className={styles.sectionTitle}>Manage Billing</h3>
			<div className={styles.card}>
				<div className={styles.actionsList}>
					<div className={styles.actionRow}>
						<div className={styles.actionInfo}>
							<span className={styles.actionLabel}>Billing Portal</span>
							<span className={styles.actionDescription}>
								View invoices, billing history, and manage your subscription
							</span>
						</div>
						<Button
							variant="secondary"
							leftIcon={<ExternalLink size={16} />}
							onClick={onManage}
							disabled={portalLoading || !portalUrl}
						>
							{portalLoading ? "Loading..." : "Open Portal"}
						</Button>
					</div>

					<div className={styles.divider} />

					<div className={styles.actionRow}>
						<div className={styles.actionInfo}>
							<span className={styles.actionLabel}>Change Plan</span>
							<span className={styles.actionDescription}>
								Upgrade or downgrade your subscription
							</span>
						</div>
						<Button variant="secondary" onClick={onChangePlan}>
							{status === "canceled" ? "Resubscribe" : "Change Plan"}
						</Button>
					</div>

					<div className={styles.divider} />

					<div className={styles.actionRow}>
						<div className={styles.actionInfo}>
							<span className={styles.actionLabel}>Payment Method</span>
							<span className={styles.actionDescription}>
								Update your credit card or payment details
							</span>
						</div>
						<Button
							variant="secondary"
							leftIcon={<CreditCard size={16} />}
							onClick={onUpdatePayment}
						>
							Update
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
});

BillingActions.displayName = "BillingActions";

// ============================================================================
// Component
// ============================================================================

/**
 * BillingPage displays subscription and billing management
 */
export const BillingPage = memo(function BillingPage() {
	const { loading, error, subscription } = useSubscriptionWithPlan();
	const {
		portalLoading,
		portalUrl,
		handleManageSubscription,
		handleChangePlan,
		handleUpdatePaymentMethod,
	} = useBillingActions();

	// Loading state
	if (loading) {
		return <Spinner size="lg" label="Loading billing information..." />;
	}

	// Redirect pending (no subscription)
	if (error?.error === "no active subscription found") {
		return null;
	}

	// Error state
	if (error) {
		return <ErrorState message={`Something went wrong: ${error.error}`} />;
	}

	// Empty state
	if (!subscription) {
		return (
			<EmptyState
				icon={<CreditCard size={48} />}
				title="No subscription found"
				description="You don't have an active subscription."
				action={
					<Button variant="primary" onClick={handleChangePlan}>
						View Plans
					</Button>
				}
			/>
		);
	}

	return (
		<Stack gap="lg" className={styles.billing} animate>
			<h2 className={styles.pageTitle}>Billing</h2>

			<SubscriptionCard subscription={subscription} />

			<BillingActions
				status={subscription.status}
				portalUrl={portalUrl}
				portalLoading={portalLoading}
				onManage={handleManageSubscription}
				onChangePlan={handleChangePlan}
				onUpdatePayment={handleUpdatePaymentMethod}
			/>
		</Stack>
	);
});

BillingPage.displayName = "BillingPage";
