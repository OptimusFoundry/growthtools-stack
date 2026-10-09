/**
 * GitHubConnectionSection Component
 * Renders GitHub connection state inline (no card chrome — wrapped by caller).
 */

import {
	Badge,
	Button,
	List,
	Rule,
	SectionHeader,
	Spinner,
	Stack,
	Text,
} from "@optimusfoundry/quiet";
import { GitBranch } from "lucide-react";
import { memo } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
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

	const icon = (
		<span className={styles.icon}>
			<AppIcon icon={GitBranch} size="lg" />
		</span>
	);

	if (!state.connection) {
		return (
			<List
				divided
				items={[
					{
						id: "github",
						leading: icon,
						primary: "GitHub",
						secondary: "Auto-generate posts from repository activity",
						trailing: (
							<Button
								variant="secondary"
								size="sm"
								aria-label="Connect GitHub"
								onClick={handlers.handleConnect}
							>
								Connect
							</Button>
						),
					},
				]}
			/>
		);
	}

	return (
		<Stack gap="md">
			<List
				divided
				items={[
					{
						id: "github",
						leading: icon,
						primary: (
							<Stack direction="row" gap="xs" align="center">
								<Text weight="semibold">GitHub</Text>
								<Badge variant="success" size="sm">
									Connected
								</Badge>
							</Stack>
						),
						secondary: `@${state.connection.github_username}`,
						trailing: (
							<Button
								variant="ghost"
								size="sm"
								aria-label="Disconnect GitHub"
								onClick={handlers.handleDisconnect}
							>
								Disconnect
							</Button>
						),
					},
				]}
			/>

			<Rule />

			<SectionHeader
				size="sm"
				as="h3"
				title="Repositories"
				description="Toggle which repositories to watch for new commits."
			/>
			<GitHubRepoSelector connectionId={state.connection.id} />
		</Stack>
	);
});

GitHubConnectionSection.displayName = "GitHubConnectionSection";
