import {
	Badge,
	Button,
	Card,
	Col,
	Container,
	EmptyState,
	Grid,
	Rule,
	SectionHeader,
	Spinner,
	Stack,
	Text,
} from "@optimusfoundry/quiet";
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
import { AppIcon } from "@/components/AppIcon/AppIcon";
import PlanToPay from "@/components/billing/plans/planPay";
import { ErrorState } from "@/components/error/error";
import { useCreateCustomerPortal } from "@/hooks/useCreateCustomerPortal";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { useGetCurrentSubscription } from "@/hooks/useGetCurrentSubscription";
import type { Price, Subscription } from "@/types/billing";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./BillingTab.module.scss";

interface PlanDetails {
	name: string;
	price: string;
	interval: string;
}

type StatusVariant = "success" | "warning" | "secondary";

function getStatusVariant(status: Subscription["status"]): StatusVariant {
	if (status === "active") return "success";
	if (status === "canceled") return "warning";
	return "secondary";
}

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
	return (
		<Stack as="section" gap="lg">
			<SectionHeader size="sm" as="h2" title="Current Plan" />
			<Card>
				<Stack gap="sm" align="flex-start">
					<Stack gap="xs" direction="row" align="center">
						<AppIcon icon={Sparkles} size="lg" />
						<Text size="xl" weight="semibold" as="span">
							{planDetails?.name || "Loading..."}
						</Text>
						<Badge variant={getStatusVariant(subscription.status)} size="sm">
							{subscription.status}
						</Badge>
					</Stack>

					<Stack direction="row" gap={4} align="baseline">
						<Text size="2xl" weight="bold" as="span">
							{planDetails?.price || "--"}
						</Text>
						{planDetails?.interval && (
							<Text size="sm" color="muted" as="span">
								/{planDetails.interval}
							</Text>
						)}
					</Stack>

					{subscription.status === "active" && subscription.nextBillingDate && (
						<Stack direction="row" gap={4} align="center">
							<AppIcon icon={Calendar} size="md" color="muted" />
							<Text size="sm" color="muted" as="span">
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
							Your subscription will remain active until the end of the current
							billing period.
						</Text>
					)}

					<Button
						variant="secondary"
						onClick={onChangePlan}
						rightIcon={<AppIcon icon={ArrowUpRight} />}
					>
						{subscription.status === "canceled" ? "Resubscribe" : "Change Plan"}
					</Button>
				</Stack>
			</Card>
		</Stack>
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
		<Stack
			direction="row"
			gap="xs"
			align="center"
			className={styles.quickAction}
		>
			<div className={styles.quickActionIcon}>{icon}</div>
			<Stack gap={4} className={styles.quickActionContent}>
				<Text weight="medium">{title}</Text>
				<Text size="sm" color="muted">
					{description}
				</Text>
			</Stack>
			<div className={styles.quickActionButton}>{action}</div>
		</Stack>
	);
});

QuickAction.displayName = "QuickAction";

interface BillingActionsProps {
	portalUrl?: string;
	portalLoading: boolean;
	onManageBilling: () => void;
}

const BillingActions = memo(function BillingActions({
	portalUrl,
	portalLoading,
	onManageBilling,
}: BillingActionsProps) {
	return (
		<Stack as="section" gap="lg">
			<SectionHeader size="sm" as="h2" title="Billing & Invoices" />

			<Stack gap="none">
				<QuickAction
					icon={<AppIcon icon={Receipt} size="lg" color="muted" />}
					title="View Invoices"
					description="Download past invoices and receipts"
					action={
						<Button
							variant="ghost"
							size="sm"
							onClick={onManageBilling}
							disabled={portalLoading || !portalUrl}
							rightIcon={<AppIcon icon={ExternalLink} />}
						>
							View
						</Button>
					}
				/>

				<Rule />

				<QuickAction
					icon={<AppIcon icon={CreditCard} size="lg" color="muted" />}
					title="Payment Method"
					description="Update your card or payment details"
					action={
						<Button
							variant="ghost"
							size="sm"
							onClick={onManageBilling}
							disabled={portalLoading || !portalUrl}
							rightIcon={<AppIcon icon={ExternalLink} />}
						>
							Manage
						</Button>
					}
				/>
			</Stack>
		</Stack>
	);
});

BillingActions.displayName = "BillingActions";

const NoSubscriptionState = memo(function NoSubscriptionState() {
	const { loading, prices, error } = useGetAllPrices();

	if (loading) {
		return <Spinner size="lg" />;
	}

	if (error) {
		return <ErrorState message={`Failed to load plans: ${error}`} />;
	}

	if (!prices?.length) {
		return <EmptyState title="No pricing plans available" icon={null} />;
	}

	return (
		<Stack gap="lg">
			<SectionHeader
				size="sm"
				as="h2"
				title="Choose a Plan"
				description="Select a plan below to get started with your subscription."
			/>
			<Grid columns={12} gap="sm">
				{prices.map((price) => (
					<Col key={price.priceId} span={4} spanMd={6} spanSm={12}>
						<PlanToPay {...price} />
					</Col>
				))}
			</Grid>
		</Stack>
	);
});

NoSubscriptionState.displayName = "NoSubscriptionState";

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

	if (error?.error === "no active subscription found" || !currentSubscription) {
		return (
			<Container size="lg" padded={false} className={styles.container}>
				<NoSubscriptionState />
			</Container>
		);
	}

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

				<BillingActions
					portalUrl={portalUrl}
					portalLoading={portalLoading}
					onManageBilling={handleManageBilling}
				/>
			</Stack>
		</Container>
	);
});

BillingTab.displayName = "BillingTab";
