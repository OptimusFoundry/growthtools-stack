/**
 * GitHubDisconnectedCard Component
 * Displays invitation to connect GitHub account
 */

import { Github } from "lucide-react";
import { memo } from "react";
import {
	Card,
	CardBody,
	CardFooter,
	CardHeader,
} from "@/proto-design-system/components/layout/Card";
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
		<Card variant="spec">
			<CardHeader
				name={
					<>
						Git<em>Hub</em>
					</>
				}
				meta="AVAILABLE"
			/>
			<CardBody>
				<div className={styles.availableCardBody}>
					<div className={styles.availableCardIcon}>
						<Github size={24} />
					</div>
					<Text size="sm" color="secondary">
						Auto-generate posts from repository activity.
					</Text>
				</div>
			</CardBody>
			<CardFooter className={styles.footerActions}>
				<Button variant="secondary" size="sm" onClick={onConnect}>
					Connect
				</Button>
			</CardFooter>
		</Card>
	);
});

GitHubDisconnectedCard.displayName = "GitHubDisconnectedCard";
