/**
 * AvailablePlatformCard Component
 * Displays an available social media platform to connect
 */

import { memo } from "react";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import {
	PLATFORM_DISPLAY_NAMES,
	PLATFORM_INFO,
	type PlatformType,
} from "@/types/platform";
import styles from "./PlatformConnectionsTab.module.scss";

// ============================================================================
// Component
// ============================================================================

interface AvailablePlatformCardProps {
	platform: PlatformType;
	onConnect: (platform: PlatformType) => void;
	connecting: boolean;
}

export const AvailablePlatformCard = memo(function AvailablePlatformCard({
	platform,
	onConnect,
	connecting,
}: AvailablePlatformCardProps) {
	const info = PLATFORM_INFO[platform];

	return (
		<Card variant="outlined">
			<CardBody>
				<div className={styles.availableCard}>
					<div className={styles.availableCardIcon}>{info?.icon}</div>
					<Stack gap="xs" className={styles.availableCardContent}>
						<Text weight="medium">{PLATFORM_DISPLAY_NAMES[platform]}</Text>
						{info?.description && (
							<Text size="xs" color="secondary">
								{info.description}
							</Text>
						)}
					</Stack>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => onConnect(platform)}
						disabled={connecting}
					>
						{connecting ? "Connecting..." : "Connect"}
					</Button>
				</div>
			</CardBody>
		</Card>
	);
});

AvailablePlatformCard.displayName = "AvailablePlatformCard";
