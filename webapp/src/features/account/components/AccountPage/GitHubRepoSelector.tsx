/**
 * GitHubRepoSelector Component
 * Display repos and allow connecting/disconnecting them
 */

import {
	Badge,
	EmptyState,
	List,
	Spinner,
	Stack,
	Switch,
	Text,
} from "@optimusfoundry/quiet";
import { GitBranch } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { useConnectGitHubRepo } from "@/hooks/useConnectGitHubRepo";
import { useGitHubRepos } from "@/hooks/useGitHubRepos";
import { useNotify } from "@/hooks/useNotify";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import styles from "./GitHubConnectionSection.module.scss";

// ============================================================================
// Component
// ============================================================================

interface GitHubRepoSelectorProps {
	connectionId: string;
}

export const GitHubRepoSelector = memo(function GitHubRepoSelector({
	connectionId,
}: GitHubRepoSelectorProps) {
	const { repos, loading, error, refetch } = useGitHubRepos(!!connectionId);
	const {
		connectRepo,
		disconnectRepo,
		loading: mutating,
	} = useConnectGitHubRepo();
	const { notify } = useNotify();
	const [busyRepo, setBusyRepo] = useState<string | null>(null);

	useEffect(() => {
		if (error) {
			notify({
				status: "error",
				title: "Couldn't load repositories",
				description: error,
			});
		}
	}, [error, notify]);

	const handleToggle = useCallback(
		async (owner: string, name: string, isConnected: boolean) => {
			const key = `${owner}/${name}`;
			setBusyRepo(key);
			try {
				if (isConnected) {
					await disconnectRepo(owner, name);
					notify({ status: "success", title: `Disconnected ${key}` });
				} else {
					await connectRepo(owner, name);
					notify({
						status: "success",
						title: `Connected ${key}`,
						description: "We'll watch this repo for new commits.",
					});
				}
				refetch();
			} catch {
				notify({
					status: "error",
					title: isConnected
						? `Couldn't disconnect ${key}`
						: `Couldn't connect ${key}`,
					description: "Please try again.",
				});
			} finally {
				setBusyRepo(null);
			}
		},
		[connectRepo, disconnectRepo, refetch, notify],
	);

	if (loading && repos.length === 0) {
		return (
			<Stack align="center" justify="center" className={styles.loading}>
				<Spinner size="md" />
			</Stack>
		);
	}

	if (repos.length === 0) {
		return (
			<EmptyState
				icon={<AppIcon icon={GitBranch} size="2xl" />}
				title={trimTrailingPeriod("No repositories found")}
				description="We couldn't find any repositories on your GitHub account."
				size="sm"
			/>
		);
	}

	return (
		<List
			divided
			items={repos.map((repo) => {
				const key = `${repo.owner.login}/${repo.name}`;
				const isBusy = mutating && busyRepo === key;
				return {
					id: repo.id,
					primary: (
						<Stack direction="row" gap="xs" align="center">
							<Text size="sm" weight="medium">
								{repo.full_name}
							</Text>
							{repo.private && (
								<Badge variant="secondary" size="sm">
									private
								</Badge>
							)}
						</Stack>
					),
					secondary: `default branch: ${repo.default_branch}`,
					trailing: (
						<Switch
							checked={repo.connected}
							disabled={isBusy}
							onChange={() =>
								handleToggle(repo.owner.login, repo.name, repo.connected)
							}
							aria-label={`${repo.connected ? "Disconnect" : "Connect"} ${key}`}
						/>
					),
				};
			})}
		/>
	);
});

GitHubRepoSelector.displayName = "GitHubRepoSelector";
