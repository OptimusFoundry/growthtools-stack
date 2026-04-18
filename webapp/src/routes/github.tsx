import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, GitCommit, Github } from "lucide-react";
import { motion } from "motion/react";
import { Topbar } from "@/components/Layout/Topbar";
import {
	type GitHubCommitSummary,
	useGitHubCommits,
} from "@/hooks/useGitHubCommits";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Pagination } from "@/proto-design-system/components/navigation/Pagination";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./github.module.scss";
import pageStyles from "./page.module.scss";

export const Route = createFileRoute("/github")({
	component: GitHubPage,
});

const PAGE_SIZE = 25;

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

const STATUS_CLASS: Record<CommitState["kind"], string> = {
	waiting: "statusWaiting",
	processing: "statusProcessing",
	skipped: "statusSkipped",
	failed: "statusFailed",
	captured: "statusCaptured",
	post: "statusPosted",
	post_deleted: "statusDeleted",
	blog: "statusBlogged",
	blog_deleted: "statusDeleted",
};

const STATUS_LABELS: Record<CommitState["kind"], string> = {
	waiting: "Waiting",
	processing: "Processing",
	skipped: "Skipped",
	failed: "Failed",
	captured: "Captured",
	post: "Posted",
	post_deleted: "Post deleted",
	blog: "Blogged",
	blog_deleted: "Blog deleted",
};

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

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(" ");
	return (
		(lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) +
		"..."
	);
}

function metaLine(commit: GitHubCommitSummary): string {
	const parts: string[] = [];
	if (commit.repo_owner && commit.repo_name) {
		parts.push(`${commit.repo_owner}/${commit.repo_name}`);
	}
	if (commit.branch) parts.push(commit.branch);
	parts.push(commit.sha.slice(0, 7));
	if (commit.author_name) parts.push(commit.author_name);
	parts.push(timeAgo(commit.pushed_at));
	return parts.join(" · ");
}

function GitHubPage() {
	const { connection, loading: connectionLoading } = useGitHubConnection();
	const { commits, total, loading, refetch, page, setPage } = useGitHubCommits(
		!!connection,
		PAGE_SIZE,
	);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const startIdx = (page - 1) * PAGE_SIZE;

	const topbar = (
		<Topbar
			title="GitHub"
			actions={
				connection ? (
					<Button variant="ghost" size="sm" onClick={refetch}>
						Refresh
					</Button>
				) : undefined
			}
		/>
	);

	if (connectionLoading) {
		return (
			<>
				{topbar}
				<Stack gap="lg" className={styles.page} animate>
					<div className={styles.loadingState}>
						<Spinner size="lg" />
					</div>
				</Stack>
			</>
		);
	}

	return (
		<>
			{topbar}
			<Stack gap="lg" className={styles.page} animate>
				<header className={pageStyles.pageHero}>
					<div className={pageStyles.pageHeroText}>
						<div className={pageStyles.pageEyebrow}>
							Activity · {String(total).padStart(2, "0")}{" "}
							{total === 1 ? "commit" : "commits"} tracked
						</div>
						<h1 className={pageStyles.pageHeroTitle}>
							Every push, captured in <em>context</em>.
						</h1>
						<p className={pageStyles.pageHeroSub}>
							We watch your repos for shippable moments — captured artifacts,
							drafted posts, and the misses worth knowing about.
						</p>
					</div>
				</header>

				<div className={styles.content}>
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
						<div className={styles.loadingState}>
							<Spinner size="lg" />
						</div>
					) : commits.length === 0 ? (
						<EmptyState
							icon={<GitCommit size={48} />}
							title="No commits yet"
							description="Push to a watched repository and it'll show up here within seconds."
						/>
					) : (
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2 }}
							className={styles.postList}
						>
							{commits.map((commit, index) => {
								const state = commitState(commit);
								const firstLine =
									commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
								return (
									<Link
										key={commit.id}
										to="/github/$id"
										params={{ id: commit.id }}
										className={styles.postLink}
									>
										<div className={styles.postRow}>
											<div className={styles.titleRow}>
												<span className={styles.idx}>
													№ {String(startIdx + index + 1).padStart(2, "0")}
												</span>
												<div className={styles.postBody}>
													<div className={styles.postTitleText}>
														{truncate(firstLine, 80)}
													</div>
													<div className={styles.postMetaText}>
														{metaLine(commit)}
													</div>
												</div>
											</div>
											<div className={styles.metaRow}>
												<span
													className={`${styles.statusBadge} ${styles[STATUS_CLASS[state.kind]]}`}
												>
													{STATUS_LABELS[state.kind]}
												</span>
												<span className={styles.chevronBtn} aria-hidden>
													<ChevronRight size={16} />
												</span>
											</div>
										</div>
									</Link>
								);
							})}
						</motion.div>
					)}
				</div>

				{totalPages > 1 && (
					<div className={styles.paginationRow}>
						<Pagination
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
							size="sm"
							disabled={loading}
						/>
					</div>
				)}
			</Stack>
		</>
	);
}
