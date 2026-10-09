"use client";

import { Button, Card, Stack, Text } from "@optimusfoundry/quiet";
import { useNavigate } from "@tanstack/react-router";
import type { Price } from "@/types/billing";
import { formatPrice } from "@/utils/formatPrice";

export default function PlanToPay(props: Price) {
	const navigate = useNavigate();
	const handlePay = (priceId: string) => {
		navigate({
			to: "/billing/pay",
			search: { plan: priceId },
		});
	};

	const priceDisplay = formatPrice(props.unitAmount, props.currency);
	const intervalDisplay = props.interval ? `/${props.interval}` : "";

	return (
		<Card>
			<Stack gap="sm" align="center">
				<Text as="h3" size="lg" weight="semibold" transform="capitalize">
					{props.description}
				</Text>
				<Text size="2xl" weight="bold">
					{priceDisplay}
					<Text as="span" size="sm" color="muted">
						{intervalDisplay}
					</Text>
				</Text>
				<Button
					variant="primary"
					size="sm"
					onClick={() => handlePay(props.priceId)}
					fullWidth
				>
					Select Plan
				</Button>
			</Stack>
		</Card>
	);
}
