/**
 * GitHubConnectionSection Component
 * Renders GitHub connection state inline (no card chrome — wrapped by caller).
 */

import { Github } from "lucide-react";
import { memo } from "react";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./GitHubConnectionSection.module.scss";
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
			<Stack align="center" justify="center" className={styles.loading}>
				<Spinner size="md" />
			</Stack>
		);
	}

	if (!state.connection) {
		return (
			<div className={styles.row}>
				<div className={styles.icon}>
					<Github size={20} />
				</div>
				<Stack gap="xs" className={styles.body}>
					<Text weight="semibold">GitHub</Text>
					<Text size="sm" color="secondary">
						Auto-generate posts from repository activity
					</Text>
				</Stack>
				<Button variant="secondary" size="sm" onClick={handlers.handleConnect}>
					Connect
				</Button>
			</div>
		);
	}

	return (
		<Stack gap="md">
			<div className={styles.row}>
				<div className={styles.icon}>
					<Github size={20} />
				</div>
				<Stack gap="xs" className={styles.body}>
					<div className={styles.nameLine}>
						<Text weight="semibold">GitHub</Text>
						<span className={styles.statusDot} aria-label="connected" />
					</div>
					<Text size="sm" color="secondary">
						@{state.connection.github_username}
					</Text>
				</Stack>
				<Button variant="ghost" size="sm" onClick={handlers.handleDisconnect}>
					Disconnect
				</Button>
			</div>

			<Divider />

			<Stack gap="xs">
				<Text size="sm" weight="semibold">
					Repositories
				</Text>
				<Text size="xs" color="muted">
					Toggle which repositories to watch for new commits.
				</Text>
			</Stack>
			<GitHubRepoSelector connectionId={state.connection.id} />
		</Stack>
	);
});

GitHubConnectionSection.displayName = "GitHubConnectionSection";
