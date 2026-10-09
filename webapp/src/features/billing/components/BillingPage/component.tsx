/**
 * BillingPage Component
 * Container component for billing and subscription management
 */

import {
	Badge,
	Button,
	EmptyState,
	List,
	PageHero,
	SectionHeader,
	Spinner,
	Stack,
	Text,
} from "@optimusfoundry/quiet";
import { useNavigate } from "@tanstack/react-router";
import { CreditCard, ExternalLink } from "lucide-react";
import { memo, useCallback, useEffect } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { ErrorState } from "@/components/error/error";
import { useCreateCustomerPortal } from "@/hooks/useCreateCustomerPortal";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { useGetCurrentSubscription } from "@/hooks/useGetCurrentSubscription";
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

	return {
		portalLoading,
		portalUrl: portalData?.url,
		handleManageSubscription,
		handleChangePlan,
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
		<Stack as="section" gap={12}>
			<SectionHeader size="sm" as="h2" title="Current Plan" />
			<div className={styles.panel}>
				<Stack gap="xs">
					<Text size="lg" weight="medium" color="heading">
						{subscription.planName || "Unknown Plan"}
					</Text>
					<div>
						<Badge variant={statusVariant} size="md">
							{subscription.status}
						</Badge>
					</div>
					{subscription.status === "active" && subscription.nextBillingDate && (
						<Text color="muted">
							Next billing date:{" "}
							{new Date(subscription.nextBillingDate).toLocaleDateString()}
						</Text>
					)}
					{subscription.status === "canceled" && (
						<Text size="sm" color="warning">
							Your subscription will remain active until the end of the current
							billing period.
						</Text>
					)}
				</Stack>
			</div>
		</Stack>
	);
});

SubscriptionCard.displayName = "SubscriptionCard";

interface BillingActionsProps {
	status: string;
	portalUrl?: string;
	portalLoading: boolean;
	onManage: () => void;
	onChangePlan: () => void;
}

/** Billing action buttons */
const BillingActions = memo(function BillingActions({
	status,
	portalUrl,
	portalLoading,
	onManage,
	onChangePlan,
}: BillingActionsProps) {
	return (
		<Stack as="section" gap={12}>
			<SectionHeader size="sm" as="h2" title="Manage Billing" />
			<List
				bordered
				size="md"
				items={[
					{
						id: "portal",
						primary: "Billing Portal",
						secondary:
							"View invoices, update payment method, and manage your subscription",
						trailing: (
							<Button
								variant="secondary"
								leftIcon={<AppIcon icon={ExternalLink} size="md" />}
								onClick={onManage}
								disabled={portalLoading || !portalUrl}
							>
								{portalLoading ? "Loading..." : "Open Portal"}
							</Button>
						),
					},
					{
						id: "plan",
						primary: "Change Plan",
						secondary: "Upgrade or downgrade your subscription",
						trailing: (
							<Button variant="secondary" onClick={onChangePlan}>
								{status === "canceled" ? "Resubscribe" : "Change Plan"}
							</Button>
						),
					},
				]}
			/>
		</Stack>
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
	} = useBillingActions();

	// Loading state
	if (loading) {
		return <Spinner size="lg" aria-label="Loading billing information..." />;
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
				headingLevel={2}
				icon={<AppIcon icon={CreditCard} size="xl" />}
				title="No subscription found"
				description="You don't have an active subscription."
				actions={
					<Button variant="primary" onClick={handleChangePlan}>
						View Plans
					</Button>
				}
			/>
		);
	}

	return (
		<Stack gap="md" className={styles.billing} animated>
			<PageHero
				size="md"
				ruled={false}
				className={styles.hero}
				title="Billing"
			/>

			<SubscriptionCard subscription={subscription} />

			<BillingActions
				status={subscription.status}
				portalUrl={portalUrl}
				portalLoading={portalLoading}
				onManage={handleManageSubscription}
				onChangePlan={handleChangePlan}
			/>
		</Stack>
	);
});

BillingPage.displayName = "BillingPage";
