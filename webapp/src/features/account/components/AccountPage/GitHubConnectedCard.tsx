/**
 * GitHubConnectedCard Component
 * Displays connected GitHub account with disconnect button
 */

import { Github } from "lucide-react";
import { memo } from "react";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { GitHubConnection } from "@/hooks/useGitHubConnection";
import styles from "./GitHubConnectionSection.module.scss";

// ============================================================================
// Component
// ============================================================================

interface GitHubConnectedCardProps {
	connection: GitHubConnection;
	onDisconnect: () => Promise<void>;
}

export const GitHubConnectedCard = memo(function GitHubConnectedCard({
	connection,
	onDisconnect,
}: GitHubConnectedCardProps) {
	return (
		<Card variant="outlined">
			<CardBody>
				<div className={styles.connectedCard}>
					<Stack direction="row" gap="sm" align="center">
						<div className={styles.connectedCardIcon}>
							<Github size={24} />
						</div>
						<Stack gap="xs">
							<Text size="lg" weight="semibold">
								GitHub
							</Text>
							<Text size="sm" color="secondary">
								@{connection.github_username}
							</Text>
						</Stack>
					</Stack>
					<Badge variant="success" size="sm">
						connected
					</Badge>
					<div className={styles.connectedCardFooter}>
						<Button
							variant="destructive"
							size="sm"
							onClick={onDisconnect}
						>
							Disconnect
						</Button>
					</div>
				</div>
			</CardBody>
		</Card>
	);
});

GitHubConnectedCard.displayName = "GitHubConnectedCard";
