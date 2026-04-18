/**
 * GitHubDisconnectedCard Component
 * Displays invitation to connect GitHub account
 */

import { Github } from "lucide-react";
import { memo } from "react";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./GitHubConnectionSection.module.scss";

// ============================================================================
// Component
// ============================================================================

interface GitHubDisconnectedCardProps {
	onConnect: () => Promise<void>;
}

export const GitHubDisconnectedCard = memo(function GitHubDisconnectedCard({
	onConnect,
}: GitHubDisconnectedCardProps) {
	return (
		<Card variant="outlined">
			<CardBody>
				<div className={styles.availableCard}>
					<div className={styles.availableCardIcon}>
						<Github size={24} />
					</div>
					<Stack gap="xs" className={styles.availableCardContent}>
						<Text weight="medium">GitHub</Text>
						<Text size="xs" color="secondary">
							Auto-generate posts from repository activity
						</Text>
					</Stack>
					<Button
						variant="secondary"
						size="sm"
						onClick={onConnect}
					>
						Connect
					</Button>
				</div>
			</CardBody>
		</Card>
	);
});

GitHubDisconnectedCard.displayName = "GitHubDisconnectedCard";
