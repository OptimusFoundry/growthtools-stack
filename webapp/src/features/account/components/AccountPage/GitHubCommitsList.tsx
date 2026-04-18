/**
 * GitHubCommitsList Component
 * Display recent commits from connected repos
 */

import { GitBranch } from "lucide-react";
import { memo, useEffect } from "react";
import { useGitHubCommits } from "@/hooks/useGitHubCommits";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { Card, CardBody } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./GitHubConnectionSection.module.scss";

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

interface GitHubCommitsListProps {
	connectionId: string;
}

export const GitHubCommitsList = memo(function GitHubCommitsList({
	connectionId,
}: GitHubCommitsListProps) {
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

GitHubCommitsList.displayName = "GitHubCommitsList";
