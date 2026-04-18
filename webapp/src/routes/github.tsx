import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
	type GitHubCommitSummary,
	useGitHubCommits,
} from "@/hooks/useGitHubCommits";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Pagination } from "@/proto-design-system/components/navigation/Pagination";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./github.module.scss";

export const Route = createFileRoute("/github")({
	component: GitHubPage,
});

// ---------- Helpers ----------

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

type CommitState =
	| { kind: "waiting" }
	| { kind: "processing" }
	| { kind: "skipped"; reason: string }
	| { kind: "failed"; error: string }
	| { kind: "captured"; artifactCount: number }
	| { kind: "post"; postID: string }
	| { kind: "post_deleted" };

function commitState(commit: GitHubCommitSummary): CommitState {
	// post_deleted is only true when post_id is set AND the linked post has
	// been soft-deleted — distinct from the in-progress "not drafted yet"
	// state where post_id is still null.
	if (commit.post_id && commit.post_deleted) return { kind: "post_deleted" };
	if (commit.post_id) return { kind: "post", postID: commit.post_id };
	// The classifier can decide a commit isn't worth capturing. When it does
	// it stamps skipped_reason + processed_at without ever queueing work, so
	// the row would otherwise look indistinguishable from a processing one.
	if (commit.skipped_reason)
		return { kind: "skipped", reason: commit.skipped_reason };
	// Capture only fires after workflow_run:completed:success — until then
	// capture_requested_at stays null and we show "Waiting for CI".
	if (!commit.capture_requested_at) return { kind: "waiting" };
	if (!commit.processed_at) return { kind: "processing" };
	if (commit.capture_error)
		return { kind: "failed", error: commit.capture_error };
	if (commit.capture_artifact_count > 0) {
		return { kind: "captured", artifactCount: commit.capture_artifact_count };
	}
	return { kind: "processing" };
}

// ---------- Row ----------

interface CommitRowProps {
	commit: GitHubCommitSummary;
	index: number;
}

const CommitRow = memo(function CommitRow({ commit, index }: CommitRowProps) {
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

// ---------- Status badge ----------

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
	}
}

// ---------- Page ----------

const PAGE_SIZE = 25;

function GitHubPage() {
	const { connection, loading: connectionLoading } = useGitHubConnection();
	const { commits, total, loading, refetch, page, setPage } = useGitHubCommits(
		!!connection,
		PAGE_SIZE,
	);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	if (connectionLoading) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<Stack align="center" justify="center" className={styles.loading}>
					<Spinner size="lg" />
				</Stack>
			</Stack>
		);
	}

	return (
		<Stack gap="lg" className={styles.page} animate>
			<Stack direction="row" justify="between" align="start" wrap>
				<Stack gap="xs">
					<Text as="h1" size="2xl" weight="bold">
						GitHub Activity
					</Text>
					<Text color="muted">
						Every commit we received, what we captured, and what posts came out
						of it
					</Text>
				</Stack>
				{connection && (
					<Button variant="ghost" size="sm" onClick={refetch}>
						Refresh
					</Button>
				)}
			</Stack>

			{!connection ? (
				<EmptyState
					icon={<Github size={48} />}
					title="GitHub isn't connected"
					description="Connect your GitHub account in Settings → Platforms to start watching for new commits."
					action={
						<Link to="/account" search={{ tab: "platforms" }}>
							<Button variant="primary">Connect GitHub</Button>
						</Link>
					}
				/>
			) : loading && commits.length === 0 ? (
				<Stack align="center" justify="center" className={styles.loading}>
					<Spinner size="lg" />
				</Stack>
			) : commits.length === 0 ? (
				<EmptyState
					icon={<GitCommit size={48} />}
					title="No commits yet"
					description="Push to a watched repository and it'll show up here within seconds."
				/>
			) : (
				<Stack gap="md">
					<Stack gap="sm">
						{commits.map((commit, index) => (
							<CommitRow key={commit.id} commit={commit} index={index} />
						))}
					</Stack>
					{totalPages > 1 && (
						<Stack direction="row" justify="between" align="center" wrap>
							<Text size="xs" color="muted">
								{total} commit{total === 1 ? "" : "s"} · page {page} of{" "}
								{totalPages}
							</Text>
							<Pagination
								page={page}
								totalPages={totalPages}
								onPageChange={setPage}
								size="sm"
								disabled={loading}
							/>
						</Stack>
					)}
				</Stack>
			)}
		</Stack>
	);
}
