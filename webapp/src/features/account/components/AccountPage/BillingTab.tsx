/**
 * BillingTab Component
 * Displays current subscription and allows plan changes
 */

import { useNavigate } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Calendar,
	CreditCard,
	ExternalLink,
	Receipt,
	Sparkles,
} from "lucide-react";
import { memo, useCallback } from "react";
import PlanToPay from "@/components/billing/plans/planPay";
import { ErrorState } from "@/components/error/error";
import { useCreateCustomerPortal } from "@/hooks/useCreateCustomerPortal";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { useGetCurrentSubscription } from "@/hooks/useGetCurrentSubscription";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Container } from "@/proto-design-system/components/layout/Container";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Grid } from "@/proto-design-system/components/layout/Grid";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { Price, Subscription } from "@/types/billing";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./BillingTab.module.scss";

// ============================================================================
// Types
// ============================================================================

interface PlanDetails {
	name: string;
	price: string;
	interval: string;
}

// ============================================================================
// Hooks
// ============================================================================

function usePlanDetails(priceId: string | undefined): PlanDetails | null {
	const { prices, loading } = useGetAllPrices();

	if (loading || !priceId || !prices) return null;

	const price = prices.find((p: Price) => p.priceId === priceId);
	if (!price) return null;

	return {
		name: price.description || "Unknown Plan",
		price: formatPrice(price.unitAmount, price.currency),
		interval: price.interval || "month",
	};
}

function useBillingActions() {
	const navigate = useNavigate();
	const { data: portalData, loading: portalLoading } =
		useCreateCustomerPortal();

	const handleChangePlan = useCallback(() => {
		navigate({ to: "/billing/plans" });
	}, [navigate]);

	const handleManageBilling = useCallback(() => {
		if (portalData?.url) {
			window.open(portalData.url, "_blank");
		}
	}, [portalData]);

	return {
		portalLoading,
		portalUrl: portalData?.url,
		handleChangePlan,
		handleManageBilling,
	};
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SubscriptionSummaryProps {
	subscription: Subscription;
	planDetails: PlanDetails | null;
	onChangePlan: () => void;
}

const SubscriptionSummary = memo(function SubscriptionSummary({
	subscription,
	planDetails,
	onChangePlan,
}: SubscriptionSummaryProps) {
	const statusVariant =
		subscription.status === "active"
			? "success"
			: subscription.status === "canceled"
				? "warning"
				: "secondary";

	return (
		<Card variant="outlined">
			<CardBody>
				<Stack gap="md" align="start">
					<Stack direction="row" gap="sm" align="center" justify="between">
						<Text as="h3" size="lg" weight="medium">
							Current Plan
						</Text>
						<Badge variant={statusVariant} size="sm">
							{subscription.status}
						</Badge>
					</Stack>

					<Stack gap="sm">
						<Stack direction="row" gap="sm" align="center">
							<Sparkles size={20} className={styles.planIcon} />
							<Text size="xl" weight="semibold">
								{planDetails?.name || "Loading..."}
							</Text>
						</Stack>

						<Stack direction="row" gap="xs" align="baseline">
							<Text size="2xl" weight="bold">
								{planDetails?.price || "--"}
							</Text>
							{planDetails?.interval && (
								<Text size="sm" color="secondary">
									/{planDetails.interval}
								</Text>
							)}
						</Stack>

						{subscription.status === "active" &&
							subscription.nextBillingDate && (
								<Stack direction="row" gap="xs" align="center">
									<Calendar size={14} className={styles.secondaryIcon} />
									<Text size="sm" color="secondary">
										Renews{" "}
										{new Date(subscription.nextBillingDate).toLocaleDateString(
											"en-US",
											{
												month: "short",
												day: "numeric",
												year: "numeric",
											},
										)}
									</Text>
								</Stack>
							)}

						{subscription.status === "canceled" && (
							<Text size="sm" color="warning">
								Your subscription will remain active until the end of the
								current billing period.
							</Text>
						)}
					</Stack>

					<Button variant="secondary" onClick={onChangePlan}>
						{subscription.status === "canceled" ? "Resubscribe" : "Change Plan"}
						<ArrowUpRight size={16} />
					</Button>
				</Stack>
			</CardBody>
		</Card>
	);
});

SubscriptionSummary.displayName = "SubscriptionSummary";

interface QuickActionProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	action: React.ReactNode;
}

const QuickAction = memo(function QuickAction({
	icon,
	title,
	description,
	action,
}: QuickActionProps) {
	return (
		<div className={styles.quickAction}>
			<div className={styles.quickActionIcon}>{icon}</div>
			<Stack gap="xs" className={styles.quickActionContent}>
				<Text weight="medium">{title}</Text>
				<Text size="sm" color="secondary">
					{description}
				</Text>
			</Stack>
			<div className={styles.quickActionButton}>{action}</div>
		</div>
	);
});

QuickAction.displayName = "QuickAction";

interface BillingActionsCardProps {
	portalUrl?: string;
	portalLoading: boolean;
	onManageBilling: () => void;
}

const BillingActionsCard = memo(function BillingActionsCard({
	portalUrl,
	portalLoading,
	onManageBilling,
}: BillingActionsCardProps) {
	return (
		<Card variant="outlined">
			<CardBody>
				<Stack gap="md">
					<Text as="h3" size="lg" weight="medium">
						Billing & Invoices
					</Text>

					<Stack gap="sm">
						<QuickAction
							icon={<Receipt size={20} />}
							title="View Invoices"
							description="Download past invoices and receipts"
							action={
								<Button
									variant="ghost"
									size="sm"
									onClick={onManageBilling}
									disabled={portalLoading || !portalUrl}
									rightIcon={<ExternalLink size={14} />}
								>
									View
								</Button>
							}
						/>

						<Divider />

						<QuickAction
							icon={<CreditCard size={20} />}
							title="Payment Method"
							description="Update your card or payment details"
							action={
								<Button
									variant="ghost"
									size="sm"
									onClick={onManageBilling}
									disabled={portalLoading || !portalUrl}
									rightIcon={<ExternalLink size={14} />}
								>
									Manage
								</Button>
							}
						/>
					</Stack>
				</Stack>
			</CardBody>
		</Card>
	);
});

BillingActionsCard.displayName = "BillingActionsCard";

/** No subscription state - shows available plans */
const NoSubscriptionState = memo(function NoSubscriptionState() {
	const { loading, prices, error } = useGetAllPrices();

	if (loading) {
		return <Spinner size="lg" />;
	}

	if (error) {
		return <ErrorState message={`Failed to load plans: ${error}`} />;
	}

	if (!prices?.length) {
		return <EmptyState title="No pricing plans available" />;
	}

	return (
		<Stack gap="lg">
			<Stack gap="xs">
				<Text as="h3" size="xl" weight="semibold">
					Choose a Plan
				</Text>
				<Text color="secondary">
					Select a plan below to get started with your subscription.
				</Text>
			</Stack>
			<Grid columns="3" gap="md" className={styles.plansGrid}>
				{prices.map((price) => (
					<PlanToPay key={price.priceId} {...price} />
				))}
			</Grid>
		</Stack>
	);
});

NoSubscriptionState.displayName = "NoSubscriptionState";

// ============================================================================
// Component
// ============================================================================

/**
 * BillingTab displays current subscription and plan options
 */
export const BillingTab = memo(function BillingTab() {
	const { loading, error, currentSubscription } = useGetCurrentSubscription();
	const planDetails = usePlanDetails(currentSubscription?.priceId);
	const { portalLoading, portalUrl, handleChangePlan, handleManageBilling } =
		useBillingActions();

	if (loading) {
		return (
			<Container size="md" padded={false} className={styles.container}>
				<Stack align="center" justify="center" className={styles.loadingState}>
					<Spinner size="lg" />
				</Stack>
			</Container>
		);
	}

	// No subscription - show available plans
	if (error?.error === "no active subscription found" || !currentSubscription) {
		return (
			<Container size="lg" padded={false} className={styles.container}>
				<NoSubscriptionState />
			</Container>
		);
	}

	// Error state
	if (error) {
		return (
			<Container size="md" padded={false} className={styles.container}>
				<ErrorState message={`Something went wrong: ${error.error}`} />
			</Container>
		);
	}

	return (
		<Container size="md" padded={false} className={styles.container}>
			<Stack gap="xl">
				<SubscriptionSummary
					subscription={currentSubscription}
					planDetails={planDetails}
					onChangePlan={handleChangePlan}
				/>

				<BillingActionsCard
					portalUrl={portalUrl}
					portalLoading={portalLoading}
					onManageBilling={handleManageBilling}
				/>
			</Stack>
		</Container>
	);
});

BillingTab.displayName = "BillingTab";
