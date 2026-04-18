/**
 * GitHubRepoSelector Component
 * Display repos and allow connecting/disconnecting them
 */

import { GitBranch } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useConnectGitHubRepo } from "@/hooks/useConnectGitHubRepo";
import { useGitHubRepos } from "@/hooks/useGitHubRepos";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
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
	const { addBanner } = useBannerCenter();
	const [busyRepo, setBusyRepo] = useState<string | null>(null);

	useEffect(() => {
		if (error) {
			addBanner({
				type: "error",
				title: "Couldn't load repositories",
				description: error,
				dismissible: true,
			});
		}
	}, [error, addBanner]);

	const handleToggle = useCallback(
		async (owner: string, name: string, isConnected: boolean) => {
			const key = `${owner}/${name}`;
			setBusyRepo(key);
			try {
				if (isConnected) {
					await disconnectRepo(owner, name);
					addBanner({
						type: "success",
						title: `Disconnected ${key}`,
						dismissible: true,
					});
				} else {
					await connectRepo(owner, name);
					addBanner({
						type: "success",
						title: `Connected ${key}`,
						description: "We'll watch this repo for new commits.",
						dismissible: true,
					});
				}
				refetch();
			} catch {
				addBanner({
					type: "error",
					title: isConnected
						? `Couldn't disconnect ${key}`
						: `Couldn't connect ${key}`,
					description: "Please try again.",
					dismissible: true,
				});
			} finally {
				setBusyRepo(null);
			}
		},
		[connectRepo, disconnectRepo, refetch, addBanner],
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
				icon={<GitBranch size={48} />}
				title="No repositories found"
				description="We couldn't find any repositories on your GitHub account."
				size="sm"
			/>
		);
	}

	return (
		<Stack gap="sm">
			<Card variant="outlined">
				<CardBody>
					<Stack gap="xs">
						{repos.map((repo, index) => {
							const key = `${repo.owner.login}/${repo.name}`;
							const isBusy = mutating && busyRepo === key;
							return (
								<div key={repo.id}>
									{index > 0 && <Divider />}
									<div className={styles.repoRow}>
										<Stack gap="xs" className={styles.repoInfo}>
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
											<Text size="xs" color="muted">
												default branch: {repo.default_branch}
											</Text>
										</Stack>
										<Switch
											checked={repo.connected}
											disabled={isBusy}
											onChange={() =>
												handleToggle(
													repo.owner.login,
													repo.name,
													repo.connected,
												)
											}
											aria-label={`${repo.connected ? "Disconnect" : "Connect"} ${key}`}
										/>
									</div>
								</div>
							);
						})}
					</Stack>
				</CardBody>
			</Card>
		</Stack>
	);
});

GitHubRepoSelector.displayName = "GitHubRepoSelector";
