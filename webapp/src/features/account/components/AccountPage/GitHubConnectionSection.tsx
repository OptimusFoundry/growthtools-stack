import { GitBranch, Github } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useConnectGitHubRepo } from "@/hooks/useConnectGitHubRepo";
import { useDisconnectGitHub } from "@/hooks/useDisconnectGitHub";
import { useGitHubCommits } from "@/hooks/useGitHubCommits";
import {
	type GitHubConnection,
	useGitHubConnection,
} from "@/hooks/useGitHubConnection";
import { useGitHubRepos } from "@/hooks/useGitHubRepos";
import { useInitGitHubOAuth } from "@/hooks/useInitGitHubOAuth";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./GitHubConnectionSection.module.scss";

// ============================================================================
// Sub-components
// ============================================================================

interface DisconnectedCardProps {
	onConnect: () => void;
	connecting: boolean;
}

const DisconnectedCard = memo(function DisconnectedCard({
	onConnect,
	connecting,
}: DisconnectedCardProps) {
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
						disabled={connecting}
					>
						{connecting ? "Connecting..." : "Connect"}
					</Button>
				</div>
			</CardBody>
		</Card>
	);
});

DisconnectedCard.displayName = "DisconnectedCard";

interface ConnectedCardProps {
	connection: GitHubConnection;
	onDisconnect: () => void;
	disconnecting: boolean;
}

const ConnectedCard = memo(function ConnectedCard({
	connection,
	onDisconnect,
	disconnecting,
}: ConnectedCardProps) {
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
							disabled={disconnecting}
						>
							{disconnecting ? "Disconnecting..." : "Disconnect"}
						</Button>
					</div>
				</div>
			</CardBody>
		</Card>
	);
});

ConnectedCard.displayName = "ConnectedCard";

// ============================================================================
// Repo list
// ============================================================================

interface RepoListProps {
	connectionId: string;
}

const RepoList = memo(function RepoList({ connectionId }: RepoListProps) {
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

RepoList.displayName = "RepoList";

// ============================================================================
// Commits list
// ============================================================================

interface CommitsListProps {
	connectionId: string;
}

function formatRelative(dateStr: string): string {
	const date = new Date(dateStr);
	const diffMs = Date.now() - date.getTime();
	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

const CommitsList = memo(function CommitsList({
	connectionId,
}: CommitsListProps) {
	const { commits, loading, error } = useGitHubCommits(!!connectionId, 10);
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		if (error) {
			addBanner({
				type: "error",
				title: "Couldn't load commits",
				description: error,
				dismissible: true,
			});
		}
	}, [error, addBanner]);

	if (loading && commits.length === 0) {
		return (
			<Stack align="center" justify="center" className={styles.loading}>
				<Spinner size="md" />
			</Stack>
		);
	}

	if (commits.length === 0) {
		return (
			<EmptyState
				icon={<GitBranch size={48} />}
				title="No commits yet"
				description="Push to a connected repository and commits will appear here."
				size="sm"
			/>
		);
	}

	return (
		<Card variant="outlined">
			<CardBody>
				<Stack gap="xs">
					{commits.map((commit, index) => (
						<div key={commit.id}>
							{index > 0 && <Divider />}
							<Stack gap="xs" className={styles.commitRow}>
								<Stack direction="row" gap="sm" justify="between" align="start">
									<Text
										size="sm"
										weight="medium"
										className={styles.commitMessage}
									>
										{commit.message.split("\n")[0]}
									</Text>
									<Text size="xs" color="muted">
										{formatRelative(commit.pushed_at)}
									</Text>
								</Stack>
								<Stack direction="row" gap="sm" align="center" wrap>
									<Text size="xs" color="muted">
										{commit.sha.slice(0, 7)}
									</Text>
									{commit.branch && (
										<Badge variant="secondary" size="sm">
											{commit.branch}
										</Badge>
									)}
									{commit.author_name && (
										<Text size="xs" color="muted">
											by {commit.author_name}
										</Text>
									)}
								</Stack>
							</Stack>
						</div>
					))}
				</Stack>
			</CardBody>
		</Card>
	);
});

CommitsList.displayName = "CommitsList";

// ============================================================================
// Section
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
	const { connection, loading, refetch } = useGitHubConnection();
	const { initOAuth, loading: initLoading } = useInitGitHubOAuth();
	const { disconnect, loading: disconnectLoading } = useDisconnectGitHub();
	const { addBanner } = useBannerCenter();

	// One-shot banner after OAuth callback — surface via global notification
	// center, then strip the query param so it doesn't re-fire on navigation.
	useEffect(() => {
		if (!callbackStatus) return;
		if (callbackStatus === "connected") {
			addBanner({
				type: "success",
				title: "GitHub connected",
				description: "We'll watch your selected repos for new commits.",
				dismissible: true,
			});
		} else {
			addBanner({
				type: "error",
				title: "GitHub connection failed",
				description: "Please try again.",
				dismissible: true,
			});
		}
		onClearCallbackStatus?.();
	}, [callbackStatus, addBanner, onClearCallbackStatus]);

	const handleConnect = useCallback(async () => {
		try {
			const url = await initOAuth();
			window.location.href = url;
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't start GitHub OAuth",
				description: "Please try again.",
				dismissible: true,
			});
		}
	}, [initOAuth, addBanner]);

	const handleDisconnect = useCallback(async () => {
		try {
			await disconnect();
			refetch();
			addBanner({
				type: "success",
				title: "GitHub disconnected",
				dismissible: true,
			});
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't disconnect GitHub",
				description: "Please try again.",
				dismissible: true,
			});
		}
	}, [disconnect, refetch, addBanner]);

	if (loading && !connection) {
		return (
			<Stack gap="md">
				<Stack gap="xs">
					<Text as="h3" size="lg" weight="semibold">
						GitHub
					</Text>
					<Text color="muted" size="sm">
						Connect your GitHub account to auto-generate posts from commits.
					</Text>
				</Stack>
				<Stack align="center" justify="center" className={styles.loading}>
					<Spinner size="md" />
				</Stack>
			</Stack>
		);
	}

	return (
		<Stack gap="md">
			<Stack gap="xs">
				<Text as="h3" size="lg" weight="semibold">
					GitHub
				</Text>
				<Text color="muted" size="sm">
					Connect your GitHub account to auto-generate posts from commits.
				</Text>
			</Stack>

			{connection ? (
				<Stack gap="md">
					<ConnectedCard
						connection={connection}
						onDisconnect={handleDisconnect}
						disconnecting={disconnectLoading}
					/>

					<Stack gap="xs">
						<Text size="sm" weight="semibold">
							Repositories
						</Text>
						<Text size="xs" color="muted">
							Toggle which repositories to watch for new commits.
						</Text>
					</Stack>
					<RepoList connectionId={connection.id} />

					<Stack gap="xs">
						<Text size="sm" weight="semibold">
							Recent commits
						</Text>
						<Text size="xs" color="muted">
							Latest pushes across connected repositories.
						</Text>
					</Stack>
					<CommitsList connectionId={connection.id} />
				</Stack>
			) : (
				<DisconnectedCard onConnect={handleConnect} connecting={initLoading} />
			)}
		</Stack>
	);
});

GitHubConnectionSection.displayName = "GitHubConnectionSection";
