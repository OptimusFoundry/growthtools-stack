import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { fetcher } from "@/api";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { useGetCurrentSubscription } from "@/hooks/useGetCurrentSubscription";
import { Banner } from "@/proto-design-system/components/feedback/Banner";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { CustomerPortalResponse, Price } from "@/types/billing";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./plans.module.scss";

export const Route = createFileRoute("/billing/plans")({
	component: RouteComponent,
});

// ============================================================================
// Types
// ============================================================================

interface PlanFeature {
	text: string;
	included: boolean;
}

interface Plan {
	id: string;
	name: string;
	description: string;
	features: PlanFeature[];
	highlighted?: boolean;
	badge?: string;
	note?: string;
}

// ============================================================================
// Plan Data (features/UI only - prices come from API)
// ============================================================================

const PLANS: Plan[] = [
	{
		id: "free",
		name: "Free",
		description: "For side projects",
		features: [
			{ text: "1 campaign", included: true },
			{ text: "200 leads", included: true },
			{ text: "Visual form builder", included: true },
			{ text: "Basic analytics", included: true },
			{ text: "Full widget embed", included: true },
			{ text: "Launchcamp branding", included: false },
		],
		note: "No credit card required",
	},
	{
		id: "pro",
		name: "Pro",
		description: "For growing startups",
		features: [
			{ text: "Unlimited campaigns", included: true },
			{ text: "5,000 leads", included: true },
			{ text: "Referral system", included: true },
			{ text: "Visual form & email builders", included: true },
			{ text: "All widget types", included: true },
			{ text: "Anti-spam protection", included: true },
			{ text: "Enhanced lead data", included: true },
			{ text: "Remove branding", included: true },
		],
		highlighted: true,
		badge: "Most popular",
	},
	{
		id: "team",
		name: "Team",
		description: "For scaling teams",
		features: [
			{ text: "Everything in Pro", included: true },
			{ text: "100,000 leads", included: true },
			{ text: "Up to 5 team members", included: true },
			{ text: "Role-based permissions", included: true },
			{ text: "Webhooks & Zapier", included: true },
			{ text: "Tracking pixels", included: true },
			{ text: "Email blasts", included: true },
			{ text: "Priority support", included: true },
		],
	},
];

// ============================================================================
// Components
// ============================================================================

interface BillingToggleProps {
	isYearly: boolean;
	onToggle: () => void;
}

const BillingToggle = memo(function BillingToggle({
	isYearly,
	onToggle,
}: BillingToggleProps) {
	return (
		<div className={styles.billingToggle}>
			<Text
				weight={!isYearly ? "medium" : "normal"}
				color={!isYearly ? "default" : "muted"}
			>
				Monthly
			</Text>
			<button
				type="button"
				className={styles.toggle}
				onClick={onToggle}
				role="switch"
				aria-checked={isYearly}
			>
				<span
					className={`${styles.toggleThumb} ${isYearly ? styles.toggleThumbActive : ""}`}
				/>
			</button>
			<Text
				weight={isYearly ? "medium" : "normal"}
				color={isYearly ? "default" : "muted"}
			>
				Annual{" "}
				<Text as="span" color="success" weight="medium">
					Save 17%
				</Text>
			</Text>
		</div>
	);
});

BillingToggle.displayName = "BillingToggle";

interface PlanPriceInfo {
	priceId: string;
	unitAmount: number | null;
	currency: string | null;
	interval: string | null;
}

interface PricingCardProps {
	plan: Plan;
	priceInfo: PlanPriceInfo | null;
	onSelect: (planId: string) => void;
	isCurrentPlan?: boolean;
	isLoading?: boolean;
}

const PricingCard = memo(function PricingCard({
	plan,
	priceInfo,
	onSelect,
	isCurrentPlan = false,
	isLoading = false,
}: PricingCardProps) {
	const priceDisplay = priceInfo
		? formatPrice(priceInfo.unitAmount, priceInfo.currency)
		: plan.id === "free"
			? "Free"
			: "—";
	const priceLabel =
		priceInfo?.interval ?? (plan.id === "free" ? "forever" : "month");

	return (
		<div
			className={`${styles.card} ${plan.highlighted ? styles.cardHighlighted : ""}`}
		>
			{plan.badge && (
				<div className={styles.badgeWrapper}>
					<Badge variant="success" size="sm">
						{plan.badge}
					</Badge>
				</div>
			)}

			<div className={styles.cardHeader}>
				<Text
					as="h3"
					size="xl"
					weight="semibold"
					className={plan.highlighted ? styles.textLight : ""}
				>
					{plan.name}
				</Text>
				<Text
					color={plan.highlighted ? "inherit" : "secondary"}
					className={plan.highlighted ? styles.textLightMuted : ""}
				>
					{plan.description}
				</Text>
			</div>

			<div className={styles.cardPricing}>
				<Text
					as="span"
					size="4xl"
					weight="bold"
					className={plan.highlighted ? styles.textLight : ""}
				>
					{priceDisplay}
				</Text>
				<Text
					as="span"
					color={plan.highlighted ? "inherit" : "secondary"}
					className={plan.highlighted ? styles.textLightMuted : ""}
				>
					/{priceLabel}
				</Text>
			</div>

			<ul className={styles.featureList}>
				{plan.features.map((feature) => (
					<li key={feature.text} className={styles.featureItem}>
						{feature.included ? (
							<Check
								size={18}
								className={
									plan.highlighted ? styles.iconLight : styles.iconSuccess
								}
							/>
						) : (
							<X size={18} className={styles.iconMuted} />
						)}
						<Text
							color={
								plan.highlighted
									? "inherit"
									: feature.included
										? "default"
										: "muted"
							}
							className={plan.highlighted ? styles.textLight : ""}
						>
							{feature.text}
						</Text>
					</li>
				))}
			</ul>

			<div className={styles.cardFooter}>
				<Button
					variant={
						isCurrentPlan ? "ghost" : plan.highlighted ? "secondary" : "outline"
					}
					onClick={() => onSelect(plan.id)}
					className={styles.ctaButton}
					disabled={isCurrentPlan || isLoading}
				>
					{isCurrentPlan ? "Current plan" : "Change plan"}
				</Button>
				{plan.note && (
					<Text size="sm" color="muted" align="center">
						{plan.note}
					</Text>
				)}
			</div>
		</div>
	);
});

PricingCard.displayName = "PricingCard";

// ============================================================================
// Price Mapping Helper
// ============================================================================

interface PriceMap {
	[planId: string]: {
		monthly?: PlanPriceInfo;
		yearly?: PlanPriceInfo;
	};
}

/**
 * Maps API prices to plan IDs based on description patterns
 * Expected descriptions: "pro", "team", or with interval like "pro_yearly"
 */
function buildPriceMap(prices: Price[] | undefined): PriceMap {
	if (!prices) return {};

	const map: PriceMap = {};

	for (const price of prices) {
		const desc = price.description.toLowerCase();

		// Match plan name from description
		let planId: string | null = null;
		if (desc.includes("free")) planId = "free";
		else if (desc.includes("pro")) planId = "pro";
		else if (desc.includes("team")) planId = "team";

		if (!planId) continue;

		// Initialize plan entry if needed
		if (!map[planId]) map[planId] = {};

		const priceInfo: PlanPriceInfo = {
			priceId: price.priceId,
			unitAmount: price.unitAmount,
			currency: price.currency,
			interval: price.interval,
		};

		// Determine billing period from interval or description
		if (
			price.interval === "year" ||
			desc.includes("year") ||
			desc.includes("annual")
		) {
			map[planId].yearly = priceInfo;
		} else {
			map[planId].monthly = priceInfo;
		}
	}

	return map;
}

// ============================================================================
// Page Component
// ============================================================================

function PlansPage() {
	const navigate = useNavigate();
	const [isYearly, setIsYearly] = useState(false);
	const [portalLoading, setPortalLoading] = useState(false);
	const [portalError, setPortalError] = useState<string | null>(null);
	const { prices, loading, error } = useGetAllPrices();
	const { currentSubscription, loading: subscriptionLoading } =
		useGetCurrentSubscription();

	// Redirect to Stripe billing portal for plan changes
	const redirectToBillingPortal = useCallback(async () => {
		setPortalLoading(true);
		setPortalError(null);
		try {
			const response = await fetcher<CustomerPortalResponse>(
				`${import.meta.env.VITE_API_URL}/api/protected/billing/create-customer-portal`,
				{ method: "POST" },
			);
			// Open billing portal in same window
			window.location.href = response.url;
		} catch {
			setPortalError("Failed to open billing portal. Please try again.");
			setPortalLoading(false);
		}
	}, []);

	// Build price map from API prices
	const priceMap = useMemo(() => buildPriceMap(prices), [prices]);

	// Check if user has an active subscription (including free $0 subscription)
	const hasActiveSubscription =
		currentSubscription && currentSubscription.status === "active";

	const handleSelectPlan = async (planId: string) => {
		// Get the Stripe price ID for this plan and billing period
		// For free plan, always use monthly (it's $0 either way)
		const billingPeriod =
			planId === "free" ? "monthly" : isYearly ? "yearly" : "monthly";
		const priceInfo = priceMap[planId]?.[billingPeriod];

		if (!priceInfo) {
			console.error(`No price found for ${planId} ${billingPeriod}`);
			return;
		}

		// If user already has an active subscription (including free), redirect to billing portal
		// The portal handles upgrades, downgrades, and plan changes with proper proration
		if (hasActiveSubscription) {
			// Check if selecting the same plan
			if (currentSubscription.priceId === priceInfo.priceId) {
				return; // Already on this plan
			}

			// Redirect to Stripe billing portal for plan change
			await redirectToBillingPortal();
			return;
		}

		// No subscription at all
		if (planId === "free") {
			// Free plan with no existing subscription - redirect to dashboard
			// The free subscription will be created on signup
			navigate({ to: "/" });
			return;
		}

		// Paid plan with no subscription - navigate to checkout for new subscription
		navigate({
			to: "/billing/pay",
			search: { plan: priceInfo.priceId },
		});
	};

	const getPriceInfo = (planId: string): PlanPriceInfo | null => {
		const billingPeriod = isYearly ? "yearly" : "monthly";
		return priceMap[planId]?.[billingPeriod] ?? null;
	};

	// Check if a plan is the current plan
	const isCurrentPlan = (planId: string): boolean => {
		if (!hasActiveSubscription) return false;
		const billingPeriod = isYearly ? "yearly" : "monthly";
		const priceInfo = priceMap[planId]?.[billingPeriod];
		return priceInfo?.priceId === currentSubscription.priceId;
	};

	if (loading || subscriptionLoading) {
		return (
			<div className={styles.page}>
				<Stack gap="xl" align="center" justify="center">
					<Spinner size="lg" />
				</Stack>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.page}>
				<Stack gap="xl" align="center">
					<Text color="error">Failed to load pricing: {error}</Text>
				</Stack>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<Stack gap="xl" align="center">
				{portalError && (
					<Banner
						type="error"
						variant="filled"
						title="Error"
						description={portalError}
					/>
				)}

				{portalLoading && (
					<Banner
						type="info"
						variant="filled"
						title="Opening Billing Portal"
						description="Redirecting you to manage your subscription..."
					/>
				)}

				<BillingToggle
					isYearly={isYearly}
					onToggle={() => setIsYearly(!isYearly)}
				/>

				<div className={styles.cardsGrid}>
					{PLANS.map((plan) => (
						<PricingCard
							key={plan.id}
							plan={plan}
							priceInfo={getPriceInfo(plan.id)}
							onSelect={handleSelectPlan}
							isCurrentPlan={isCurrentPlan(plan.id)}
							isLoading={portalLoading}
						/>
					))}
				</div>
			</Stack>
		</div>
	);
}

function RouteComponent() {
	return <PlansPage />;
}
