import { ExternalLink, GitBranch as Github } from "lucide-react";
import { memo } from "react";
import type { GitHubCommit } from "@/hooks/useGitHubCommits";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Text } from "@/proto-design-system/components/primitives/Text";
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

	return (
		<Stack gap="sm">
			<Stack direction="row" align="center" gap="sm" wrap>
				<Text as="h1" size="2xl" weight="bold">
					{firstLine}
				</Text>
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
						<Github size={14} />
						{repoLabel}
					</span>
				)}
				{commit.branch && (
					<Badge variant="secondary" size="sm">
						{commit.branch}
					</Badge>
				)}
				<span className={styles.metaItem}>
					<code className={styles.sha}>{commit.sha.slice(0, 7)}</code>
				</span>
				{commit.author_name && (
					<span className={styles.metaItem}>by {commit.author_name}</span>
				)}
				{commit.commit_url && (
					<a
						href={commit.commit_url}
						target="_blank"
						rel="noreferrer"
						className={styles.metaLink}
					>
						View on GitHub
						<ExternalLink size={12} />
					</a>
				)}
			</div>

			{restOfMessage && (
				<pre className={styles.commitBody}>{restOfMessage}</pre>
			)}
		</Stack>
	);
});

CaptureMetaCard.displayName = "CaptureMetaCard";
