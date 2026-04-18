import { Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	ExternalLink,
	GitCommit,
	Github,
	Image as ImageIcon,
	Loader2,
	MinusCircle,
	Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import type { GitHubCommitSummary } from "@/hooks/useGitHubCommits";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./commit-row.module.scss";

// ============================================================================
// Types and helpers
// ============================================================================

type CommitState =
	| { kind: "waiting" }
	| { kind: "processing" }
	| { kind: "skipped"; reason: string }
	| { kind: "failed"; error: string }
	| { kind: "captured"; artifactCount: number }
	| { kind: "post"; postID: string }
	| { kind: "post_deleted" }
	| { kind: "blog"; blogPostID: string }
	| { kind: "blog_deleted" };

function commitState(commit: GitHubCommitSummary): CommitState {
	if (commit.post_id && commit.post_deleted) return { kind: "post_deleted" };
	if (commit.post_id) return { kind: "post", postID: commit.post_id };
	if (commit.blog_post_id && commit.blog_deleted)
		return { kind: "blog_deleted" };
	if (commit.blog_post_id)
		return { kind: "blog", blogPostID: commit.blog_post_id };
	if (commit.skipped_reason)
		return { kind: "skipped", reason: commit.skipped_reason };
	if (!commit.capture_requested_at) return { kind: "waiting" };
	if (!commit.processed_at) return { kind: "processing" };
	if (commit.capture_error)
		return { kind: "failed", error: commit.capture_error };
	if (commit.capture_artifact_count > 0) {
		return { kind: "captured", artifactCount: commit.capture_artifact_count };
	}
	return { kind: "processing" };
}

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

// ============================================================================
// Status badge
// ============================================================================

interface StatusBadgeProps {
	state: CommitState;
}

function StatusBadge({ state }: StatusBadgeProps) {
	switch (state.kind) {
		case "waiting":
			return (
				<Badge variant="secondary" size="sm">
					<Clock size={12} />
					Waiting for CI
				</Badge>
			);
		case "processing":
			return (
				<Badge variant="secondary" size="sm">
					<Loader2 size={12} className={styles.spin} />
					Processing
				</Badge>
			);
		case "skipped":
			return (
				<Badge variant="secondary" size="sm" title={state.reason}>
					<MinusCircle size={12} />
					Skipped
				</Badge>
			);
		case "failed":
			return (
				<Badge variant="warning" size="sm">
					<AlertCircle size={12} />
					Capture failed
				</Badge>
			);
		case "captured":
			return (
				<Badge variant="success" size="sm">
					<ImageIcon size={12} />
					Media generated
				</Badge>
			);
		case "post":
			return (
				<Badge variant="primary" size="sm">
					<CheckCircle2 size={12} />
					Post created
				</Badge>
			);
		case "post_deleted":
			return (
				<Badge variant="secondary" size="sm">
					<Trash2 size={12} />
					Post deleted
				</Badge>
			);
		case "blog":
			return (
				<Badge variant="primary" size="sm">
					<CheckCircle2 size={12} />
					Blog created
				</Badge>
			);
		case "blog_deleted":
			return (
				<Badge variant="secondary" size="sm">
					<Trash2 size={12} />
					Blog deleted
				</Badge>
			);
	}
}

// ============================================================================
// Component
// ============================================================================

interface CommitRowProps {
	commit: GitHubCommitSummary;
	index: number;
}

export const CommitRow = memo(function CommitRow({
	commit,
	index,
}: CommitRowProps) {
	const state = commitState(commit);
	const firstLine = commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
	const repoLabel =
		commit.repo_owner && commit.repo_name
			? `${commit.repo_owner}/${commit.repo_name}`
			: "";

	const hasDetails = state.kind === "captured" || state.kind === "failed";

	const body = (
		<>
			<div className={styles.commitIcon}>
				<GitCommit size={18} />
			</div>

			<Stack gap="sm" className={styles.commitBody}>
				<div className={styles.commitHeader}>
					<Text size="sm" weight="semibold" className={styles.commitMessage}>
						{firstLine}
					</Text>
					<StatusBadge state={state} />
				</div>

				<div className={styles.commitMeta}>
					{repoLabel && (
						<span className={styles.metaItem}>
							<Github size={12} />
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
					<span className={styles.metaItem}>{timeAgo(commit.pushed_at)}</span>
					{commit.commit_url && (
						<a
							href={commit.commit_url}
							target="_blank"
							rel="noreferrer"
							className={styles.metaLink}
							onClick={(e) => e.stopPropagation()}
						>
							<ExternalLink size={12} />
						</a>
					)}
				</div>

				{state.kind === "captured" && (
					<Text size="xs" color="muted">
						{state.artifactCount} artifact
						{state.artifactCount === 1 ? "" : "s"} — click to view
					</Text>
				)}

				{state.kind === "failed" && (
					<Text size="xs" color="muted">
						{state.error}
					</Text>
				)}

				{state.kind === "post" && (
					<Link
						to="/posts/$id"
						params={{ id: state.postID }}
						onClick={(e) => e.stopPropagation()}
					>
						<Button variant="ghost" size="sm">
							View post →
						</Button>
					</Link>
				)}

				{state.kind === "post_deleted" && (
					<Text size="xs" color="muted">
						The draft created from this commit was deleted.
					</Text>
				)}

				{state.kind === "blog" && (
					<Link
						to="/blog/$id"
						params={{ id: state.blogPostID }}
						onClick={(e) => e.stopPropagation()}
					>
						<Button variant="ghost" size="sm">
							View blog →
						</Button>
					</Link>
				)}

				{state.kind === "blog_deleted" && (
					<Text size="xs" color="muted">
						The blog post created from this commit was deleted.
					</Text>
				)}
			</Stack>
		</>
	);

	const motionProps = {
		className: `${styles.commitCard} ${hasDetails ? styles.commitCardClickable : ""}`,
		initial: { opacity: 0, y: 8 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.2, delay: index * 0.03 },
	};

	if (hasDetails) {
		return (
			<motion.div {...motionProps}>
				<Link
					to="/github/$id"
					params={{ id: commit.id }}
					className={styles.commitCardLink}
				>
					{body}
				</Link>
			</motion.div>
		);
	}

	return <motion.article {...motionProps}>{body}</motion.article>;
});

CommitRow.displayName = "CommitRow";
