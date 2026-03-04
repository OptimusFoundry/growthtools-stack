"use client";
import { useGetAllPrices } from "@/hooks/useGetAllPrices";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { formatPrice } from "@/utils/formatPrice";

interface PlanCardProps {
	priceId: string;
}

export default function PlanCard(props: PlanCardProps) {
	const { loading, error, prices } = useGetAllPrices();

	if (loading) {
		return <Spinner size="md" label="Loading plan details..." />;
	}

	if (error) {
		return (
			<EmptyState
				icon="error-warning-line"
				title="Error loading plans"
				description={error}
			/>
		);
	}

	const price = prices?.find((price) => price.priceId === props.priceId);

	if (!price) {
		return (
			<EmptyState
				icon="price-tag-3-line"
				title="Price not found"
				description="The requested pricing plan could not be found."
			/>
		);
	}

	const priceDisplay = formatPrice(price.unitAmount, price.currency);
	const intervalDisplay = price.interval ? `/${price.interval}` : "";

	return (
		<Card>
			<CardBody>
				<Stack direction="row" gap="md" align="center" justify="between">
					<Stack gap="xs">
						<Text weight="semibold" transform="capitalize">
							{price.description}
						</Text>
						<Text size="lg" weight="bold">
							{priceDisplay}
							<Text as="span" size="sm" color="secondary">
								{intervalDisplay}
							</Text>
						</Text>
					</Stack>
					<Badge variant="success">Active</Badge>
				</Stack>
			</CardBody>
		</Card>
	);
}
