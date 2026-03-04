"use client";

import { useNavigate } from "@tanstack/react-router";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
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
			<CardBody>
				<Stack gap="md" align="center">
					<Text as="h3" size="lg" weight="semibold" transform="capitalize">
						{props.description}
					</Text>
					<Text size="2xl" weight="bold">
						{priceDisplay}
						<Text as="span" size="sm" color="secondary">
							{intervalDisplay}
						</Text>
					</Text>
					<Button onClick={() => handlePay(props.priceId)} isFullWidth>
						Select Plan
					</Button>
				</Stack>
			</CardBody>
		</Card>
	);
}
