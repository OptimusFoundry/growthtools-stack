import { Badge, Link, Stack, Text } from "@optimusfoundry/quiet";
import { GitBranch as Github } from "lucide-react";
import { memo } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import type { GitHubCommit } from "@/hooks/useGitHubCommits";
import styles from "./capture-meta.module.scss";

interface CaptureMetaCardProps {
	commit: GitHubCommit;
}

export const CaptureMetaCard = memo(function CaptureMetaCard({
	commit,
}: CaptureMetaCardProps) {
	const firstLine = commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
	const restOfMessage = commit.message.split("\n").slice(1).join("\n").trim();
	const repoLabel =
		commit.repo_owner && commit.repo_name
			? `${commit.repo_owner}/${commit.repo_name}`
			: "";
	const isSkipped = Boolean(commit.skipped_reason);
	const isWaiting = !isSkipped && !commit.capture_requested_at;

	return (
		<Stack gap="sm">
			<Stack direction="row" align="center" gap="sm" wrap>
				<Text as="h1" size="2xl" weight="semibold" color="heading">
					{firstLine}
				</Text>
				{isSkipped && (
					<Badge variant="warning" size="sm">
						Skipped
					</Badge>
				)}
				{isWaiting && (
					<Badge variant="secondary" size="sm">
						Waiting
					</Badge>
				)}
				{commit.post_id && !commit.post_deleted && (
					<Badge variant="primary" size="sm">
						Post created
					</Badge>
				)}
				{commit.post_id && commit.post_deleted && (
					<Badge variant="secondary" size="sm">
						Post deleted
					</Badge>
				)}
			</Stack>

			<div className={styles.meta}>
				{repoLabel && (
					<span className={styles.metaItem}>
						<AppIcon icon={Github} size="md" />
						{repoLabel}
					</span>
				)}
				{commit.branch && (
					<Badge variant="secondary" size="sm">
						{commit.branch}
					</Badge>
				)}
				<code className={styles.sha}>{commit.sha.slice(0, 7)}</code>
				{commit.author_name && (
					<span className={styles.metaItem}>by {commit.author_name}</span>
				)}
				{commit.commit_url && (
					<Link href={commit.commit_url} external variant="muted" size="sm">
						View on GitHub
					</Link>
				)}
			</div>

			{restOfMessage && (
				<pre className={styles.commitBody}>{restOfMessage}</pre>
			)}
		</Stack>
	);
});

CaptureMetaCard.displayName = "CaptureMetaCard";
