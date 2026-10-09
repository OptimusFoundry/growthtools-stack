"use client";
import {
	Badge,
	Card,
	EmptyState,
	Spinner,
	Stack,
	Text,
} from "@optimusfoundry/quiet";
import { AlertCircle, Tag } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { formatPrice } from "@/utils/formatPrice";

interface PlanCardProps {
	priceId: string;
}

export default function PlanCard(props: PlanCardProps) {
	const { loading, error, prices } = useGetAllPrices();

	if (loading) {
		return <Spinner size="md" aria-label="Loading plan details..." />;
	}

	if (error) {
		return (
			<EmptyState
				icon={<AppIcon icon={AlertCircle} size="xl" />}
				title="Error loading plans"
				description={error}
			/>
		);
	}

	const price = prices?.find((price) => price.priceId === props.priceId);

	if (!price) {
		return (
			<EmptyState
				icon={<AppIcon icon={Tag} size="xl" />}
				title="Price not found"
				description="The requested pricing plan could not be found."
			/>
		);
	}

	const priceDisplay = formatPrice(price.unitAmount, price.currency);
	const intervalDisplay = price.interval ? `/${price.interval}` : "";

	return (
		<Card>
			<Stack direction="row" gap="sm" align="center" justify="space-between">
				<Stack gap={4}>
					<Text weight="semibold" transform="capitalize">
						{price.description}
					</Text>
					<Text size="lg" weight="bold">
						{priceDisplay}
						<Text as="span" size="sm" color="muted">
							{intervalDisplay}
						</Text>
					</Text>
				</Stack>
				<Badge variant="success" size="sm">
					Active
				</Badge>
			</Stack>
		</Card>
	);
}
