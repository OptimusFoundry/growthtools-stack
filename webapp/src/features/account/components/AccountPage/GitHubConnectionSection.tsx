/**
 * GitHubConnectionSection Component
 * Orchestrates GitHub connection, repository selection, and commit tracking
 */

import { memo } from "react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { GitHubCommitsList } from "./GitHubCommitsList";
import { GitHubConnectedCard } from "./GitHubConnectedCard";
import styles from "./GitHubConnectionSection.module.scss";
import { GitHubDisconnectedCard } from "./GitHubDisconnectedCard";
import { GitHubRepoSelector } from "./GitHubRepoSelector";
import { useGitHubConnectionFlow } from "./useGitHubConnectionFlow";

// ============================================================================
// Component
// ============================================================================

export interface GitHubConnectionSectionProps {
	/** One-shot banner set by URL (?github=connected|error). */
	callbackStatus?: "connected" | "error" | null;
	/** Ack handler so the parent can strip the query param. */
	onClearCallbackStatus?: () => void;
}

export const GitHubConnectionSection = memo(function GitHubConnectionSection({
	callbackStatus,
	onClearCallbackStatus,
}: GitHubConnectionSectionProps) {
	const { state, handlers } = useGitHubConnectionFlow({
		callbackStatus,
		onClearCallbackStatus,
	});

	if (state.loading && !state.connection) {
		return (
			<Stack gap="sm">
				<Text color="muted" size="sm">
					Connect your GitHub account to auto-generate posts from commits.
				</Text>
				<Stack align="center" justify="center" className={styles.loading}>
					<Spinner size="md" />
				</Stack>
			</Stack>
		);
	}

	return (
		<Stack gap="md">
			<Text color="muted" size="sm">
				Connect your GitHub account to auto-generate posts from commits.
			</Text>

			{state.connection ? (
				<Stack gap="md">
					<GitHubConnectedCard
						connection={state.connection}
						onDisconnect={handlers.handleDisconnect}
					/>

					<Stack gap="xs">
						<Text size="sm" weight="semibold">
							Repositories
						</Text>
						<Text size="xs" color="muted">
							Toggle which repositories to watch for new commits.
						</Text>
					</Stack>
					<GitHubRepoSelector connectionId={state.connection.id} />

					<Stack gap="xs">
						<Text size="sm" weight="semibold">
							Recent commits
						</Text>
						<Text size="xs" color="muted">
							Latest pushes across connected repositories.
						</Text>
					</Stack>
					<GitHubCommitsList connectionId={state.connection.id} />
				</Stack>
			) : (
				<GitHubDisconnectedCard onConnect={handlers.handleConnect} />
			)}
		</Stack>
	);
});

GitHubConnectionSection.displayName = "GitHubConnectionSection";
