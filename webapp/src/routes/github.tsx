import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	FileImage,
	GitCommit,
	Github,
	Image as ImageIcon,
	Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import {
	type GitHubCaptureOutput,
	type GitHubCommit as GitHubCommitType,
	useGitHubCommits,
} from "@/hooks/useGitHubCommits";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
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
	| { kind: "processing" }
	| { kind: "failed"; error: string }
	| { kind: "captured"; output: GitHubCaptureOutput }
	| { kind: "post"; postID: string };

function commitState(commit: GitHubCommitType): CommitState {
	if (commit.post_id) return { kind: "post", postID: commit.post_id };
	if (!commit.processed_at) return { kind: "processing" };
	const output = commit.capture_output;
	if (output?.error) return { kind: "failed", error: output.error };
	if (output?.uploaded && output.uploaded.length > 0) {
		return { kind: "captured", output };
	}
	return { kind: "processing" };
}

function isImageKey(key: string): boolean {
	return /\.(png|jpe?g|gif|webp|svg)$/i.test(key);
}

// ---------- Row ----------

interface CommitRowProps {
	commit: GitHubCommitType;
	index: number;
}

const CommitRow = memo(function CommitRow({ commit, index }: CommitRowProps) {
	const state = commitState(commit);
	const firstLine = commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
	const repoLabel =
		commit.repo_owner && commit.repo_name
			? `${commit.repo_owner}/${commit.repo_name}`
			: "";
	const uploaded =
		state.kind === "captured" ? (state.output.uploaded ?? []) : [];
	const imageUploads = uploaded.filter((u) => u.url && isImageKey(u.key));
	const otherUploads = uploaded.filter((u) => !imageUploads.includes(u));

	return (
		<motion.article
			className={styles.commitCard}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: index * 0.03 }}
		>
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
						>
							<ExternalLink size={12} />
						</a>
					)}
				</div>

				{state.kind === "captured" && imageUploads.length > 0 && (
					<div className={styles.mediaGrid}>
						{imageUploads.slice(0, 6).map((item) => (
							<a
								key={item.key}
								href={item.url ?? undefined}
								target="_blank"
								rel="noreferrer"
								className={styles.mediaThumb}
							>
								<img src={item.url ?? ""} alt={item.key} loading="lazy" />
							</a>
						))}
					</div>
				)}

				{state.kind === "captured" && otherUploads.length > 0 && (
					<div className={styles.mediaList}>
						{otherUploads.map((item) => (
							<a
								key={item.key}
								href={item.url ?? undefined}
								target="_blank"
								rel="noreferrer"
								className={styles.mediaFile}
							>
								<FileImage size={14} />
								<span>{item.key.split("/").pop()}</span>
							</a>
						))}
					</div>
				)}

				{state.kind === "failed" && (
					<Text size="xs" color="muted">
						{state.error}
					</Text>
				)}

				{state.kind === "post" && (
					<Link to="/posts/$id" params={{ id: state.postID }}>
						<Button variant="ghost" size="sm">
							View post →
						</Button>
					</Link>
				)}
			</Stack>
		</motion.article>
	);
});

CommitRow.displayName = "CommitRow";

// ---------- Status badge ----------

interface StatusBadgeProps {
	state: CommitState;
}

function StatusBadge({ state }: StatusBadgeProps) {
	switch (state.kind) {
		case "processing":
			return (
				<Badge variant="secondary" size="sm">
					<Loader2 size={12} className={styles.spin} />
					Processing
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
	}
}

// ---------- Page ----------

function GitHubPage() {
	const { connection, loading: connectionLoading } = useGitHubConnection();
	const { commits, loading, refetch } = useGitHubCommits(!!connection, 50);

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
				<Stack gap="sm">
					{commits.map((commit, index) => (
						<CommitRow key={commit.id} commit={commit} index={index} />
					))}
				</Stack>
			)}
		</Stack>
	);
}
