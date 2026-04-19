/**
 * GitHubConnectedCard Component
 * Displays connected GitHub account with disconnect button
 */

import { Github } from "lucide-react";
import { memo } from "react";
import type { GitHubConnection } from "@/hooks/useGitHubConnection";
import {
	Card,
	CardBody,
	CardFooter,
	CardHeader,
} from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
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
		<Card variant="spec">
			<CardHeader
				name={
					<>
						Git<em>Hub</em>
					</>
				}
				meta="CONNECTED"
			/>
			<CardBody>
				<Stack direction="row" gap="sm" align="center">
					<div className={styles.connectedCardIcon}>
						<Github size={24} />
					</div>
					<Text size="sm" color="secondary">
						@{connection.github_username}
					</Text>
				</Stack>
			</CardBody>
			<CardFooter className={styles.footerActions}>
				<Button variant="destructive" size="sm" onClick={onDisconnect}>
					Disconnect
				</Button>
			</CardFooter>
		</Card>
	);
});

GitHubConnectedCard.displayName = "GitHubConnectedCard";
