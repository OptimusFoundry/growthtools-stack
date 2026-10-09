import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Grid,
	List,
	PageHero,
	Spinner,
	Stack,
	Switch,
	Text,
} from "@optimusfoundry/quiet";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { fetcher } from "@/api/client";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { useGetCurrentSubscription } from "@/hooks/useGetCurrentSubscription";
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
	/** Bolded leading phrase (the value hook). Optional. */
	prefix?: string;
	/** Plain trailing copy. Renders right after the prefix. */
	text: string;
	included: boolean;
}

interface Plan {
	id: string;
	name: string;
	description: string;
	/** "Everything in {prevTier}, plus" eyebrow above the feature list. */
	everythingIn?: string;
	features: PlanFeature[];
	highlighted?: boolean;
	badge?: string;
	/** Microcopy under the CTA — risk reversal / no-card line. */
	ctaMicrocopy?: string;
	note?: string;
}

// ============================================================================
// Plan Data (features/UI only - prices come from API)
// ============================================================================

const PLANS: Plan[] = [
	{
		id: "free",
		name: "Free",
		description: "For getting started",
		features: [
			{ text: "2 platform connections", included: true },
			{ text: "10 posts per month", included: true },
			{ text: "100 MB media storage", included: true },
			{ text: "Media library", included: true },
			{ text: "AI content generation", included: false },
			{ text: "Growth Tools branding", included: false },
		],
		note: "No credit card required",
	},
	{
		id: "pro",
		name: "Pro",
		description: "For growing creators",
		features: [
			{ text: "5 platform connections", included: true },
			{ text: "100 posts per month", included: true },
			{ text: "AI content generation", included: true },
			{ text: "Post scheduling", included: true },
			{ text: "Analytics dashboard", included: true },
			{ text: "Blog engine", included: true },
			{ text: "GitHub integration", included: true },
			{ text: "1 GB media storage", included: true },
		],
		highlighted: true,
		badge: "Most popular",
	},
	{
		id: "team",
		name: "Team",
		description: "For teams and agencies",
		features: [
			{ text: "Everything in Pro", included: true },
			{ text: "Unlimited platforms", included: true },
			{ text: "Unlimited posts", included: true },
			{ text: "Up to 5 team members", included: true },
			{ text: "10 GB media storage", included: true },
			{ text: "Remove branding", included: true },
			{ text: "Priority support", included: true },
			{ text: "Custom voice profiles", included: true },
		],
	},
];

// ============================================================================
// Components
// ============================================================================

interface BillingToggleProps {
	isYearly: boolean;
	onChange: (isYearly: boolean) => void;
}

const BillingToggle = memo(function BillingToggle({
	isYearly,
	onChange,
}: BillingToggleProps) {
	return (
		<Stack direction="row" gap={12} align="center">
			<Text
				weight={!isYearly ? "medium" : "normal"}
				color={!isYearly ? "default" : "muted"}
			>
				Monthly
			</Text>
			<Switch
				aria-label="Annual billing"
				checked={isYearly}
				onChange={(next: boolean) => onChange(next)}
			/>
			<Text
				weight={isYearly ? "medium" : "normal"}
				color={isYearly ? "default" : "muted"}
			>
				Annual{" "}
				<Text as="span" color="success" weight="medium">
					Save 17%
				</Text>
			</Text>
		</Stack>
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
	isYearly: boolean;
	onSelect: (planId: string) => void;
	isCurrentPlan?: boolean;
	isLoading?: boolean;
}

const PricingCard = memo(function PricingCard({
	plan,
	priceInfo,
	isYearly,
	onSelect,
	isCurrentPlan = false,
	isLoading = false,
}: PricingCardProps) {
	// On yearly billing, show the per-month equivalent in the price slot and
	// move the actual annual total to a smaller subline. Pre-launch math: a
	// $290/yr plan reads as $24/mo, which converts better than a wall of $290.
	const isAnnualPaid =
		isYearly && plan.id !== "free" && priceInfo?.unitAmount != null;
	const monthlyEquivalent = isAnnualPaid
		? Math.round((priceInfo?.unitAmount ?? 0) / 12 / 100)
		: null;

	const priceDisplay = isAnnualPaid
		? `$${monthlyEquivalent}`
		: priceInfo
			? formatPrice(priceInfo.unitAmount, priceInfo.currency)
			: plan.id === "free"
				? "Free"
				: "—";
	const priceLabel = isAnnualPaid
		? "mo"
		: (priceInfo?.interval ?? (plan.id === "free" ? "forever" : "month"));
	const subprice = isAnnualPaid
		? `${formatPrice(priceInfo?.unitAmount, priceInfo?.currency)} billed annually`
		: plan.id === "free"
			? null
			: "Billed monthly · cancel anytime";

	const featureItems = plan.features.map((feature) => {
		const label = (
			<>
				{feature.prefix && <strong>{feature.prefix}</strong>}
				{feature.text}
			</>
		);
		return {
			id: `${feature.prefix ?? ""}${feature.text}`,
			leading: feature.included ? (
				<AppIcon icon={Check} size="lg" color="success" />
			) : (
				<AppIcon icon={X} size="lg" color="quiet" />
			),
			primary: feature.included ? (
				label
			) : (
				<Text as="span" color="muted">
					{label}
				</Text>
			),
		};
	});

	return (
		<Card
			className={`${styles.card} ${plan.highlighted ? styles.cardHighlighted : ""}`}
			eyebrow={
				plan.badge ? (
					<Badge variant="primary" size="sm">
						{plan.badge}
					</Badge>
				) : undefined
			}
			title={plan.name}
			meta={plan.ctaMicrocopy ?? plan.note}
		>
			<Stack gap="sm">
				<Text color="muted">{plan.description}</Text>

				<Stack direction="row" gap={4} align="baseline">
					<Text as="span" size="4xl" weight="bold" color="heading">
						{priceDisplay}
					</Text>
					<Text as="span" color="muted">
						/{priceLabel}
					</Text>
				</Stack>

				{subprice && (
					<Text size="xs" color="muted">
						{subprice}
					</Text>
				)}

				{plan.everythingIn && <Text mono>{plan.everythingIn}</Text>}

				<List items={featureItems} size="sm" divided={false} />

				<Button
					fullWidth
					variant={ctaVariant(isCurrentPlan, plan.highlighted)}
					onClick={() => onSelect(plan.id)}
					disabled={isCurrentPlan || isLoading}
				>
					{isCurrentPlan ? "Current plan" : "Change plan"}
				</Button>
			</Stack>
		</Card>
	);
});

function ctaVariant(isCurrentPlan: boolean, highlighted?: boolean) {
	if (isCurrentPlan) return "ghost";
	return highlighted ? "primary" : "secondary";
}

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
			<Stack gap="xl" align="center" justify="center">
				<Spinner size="lg" />
			</Stack>
		);
	}

	if (error) {
		return (
			<Stack gap="xl" align="center">
				<Text color="error">Failed to load pricing: {error}</Text>
			</Stack>
		);
	}

	return (
		<>
			<Topbar title="Plans" />
			<Stack gap="xl" align="center" animated>
				<PageHero
					as="h1"
					size="md"
					ruled={false}
					className={styles.hero}
					title="Choose your plan"
				/>

				{portalError && (
					<Alert variant="error" title="Error">
						{portalError}
					</Alert>
				)}

				{portalLoading && (
					<Alert variant="info" title="Opening Billing Portal">
						Redirecting you to manage your subscription...
					</Alert>
				)}

				<BillingToggle isYearly={isYearly} onChange={setIsYearly} />

				<Grid columns={12} gap="lg" rowGap="lg">
					{PLANS.map((plan) => (
						<Col key={plan.id} span={4}>
							<PricingCard
								plan={plan}
								priceInfo={getPriceInfo(plan.id)}
								isYearly={isYearly}
								onSelect={handleSelectPlan}
								isCurrentPlan={isCurrentPlan(plan.id)}
								isLoading={portalLoading}
							/>
						</Col>
					))}
				</Grid>
			</Stack>
		</>
	);
}

function RouteComponent() {
	useDocumentTitle("Plans");
	return <PlansPage />;
}
