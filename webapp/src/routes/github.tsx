import {
	Badge,
	type BadgeProps,
	Button,
	EmptyState,
	Link,
	PageHero,
	Pagination,
	Spinner,
	Stack,
	Table,
	type TableProps,
	Text,
} from "@optimusfoundry/quiet";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GitCommit, GitBranch as Github } from "lucide-react";
import type { ReactNode } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
	type GitHubCommitSummary,
	useGitHubCommits,
} from "@/hooks/useGitHubCommits";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { timeAgo, truncate } from "@/utils/format";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import styles from "./github.module.scss";

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

const STATUS_META: Record<
	CommitState["kind"],
	{ label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
	waiting: { label: "Waiting", variant: "secondary" },
	processing: { label: "Processing", variant: "primary" },
	skipped: { label: "Skipped", variant: "secondary" },
	failed: { label: "Failed", variant: "error" },
	captured: { label: "Captured", variant: "warning" },
	post: { label: "Generated", variant: "success" },
	post_deleted: { label: "Post deleted", variant: "outline" },
	blog: { label: "Blogged", variant: "success" },
	blog_deleted: { label: "Blog deleted", variant: "outline" },
};

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

function commitColumns(
	startIdx: number,
): TableProps<GitHubCommitSummary>["columns"] {
	return [
		{
			key: "index",
			header: "№",
			width: 64,
			nowrap: true,
			render: (_commit, index) => (
				<Text as="span" size="xs" color="quiet" mono>
					{String(startIdx + index + 1).padStart(2, "0")}
				</Text>
			),
		},
		{
			key: "commit",
			header: "Commit",
			render: (commit) => {
				const firstLine =
					commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
				return (
					<div className={styles.commit}>
						{/* The row click navigates too; stop it so one click is one navigation. */}
						<Link
							href={`/github/${commit.id}`}
							onClick={(event) => event.stopPropagation()}
						>
							{truncate(firstLine, 80)}
						</Link>
						<Text as="span" size="xs" color="muted" truncate>
							{metaLine(commit)}
						</Text>
					</div>
				);
			},
		},
		{
			key: "status",
			header: "Status",
			nowrap: true,
			render: (commit) => {
				const meta = STATUS_META[commitState(commit).kind];
				return (
					<Badge variant={meta.variant} size="sm">
						{meta.label}
					</Badge>
				);
			},
		},
	];
}

function GitHubPage() {
	useDocumentTitle("GitHub");
	const navigate = useNavigate();
	const { connection, loading: connectionLoading } = useGitHubConnection();
	const { commits, total, loading, refetch, page, setPage } = useGitHubCommits(
		!!connection,
		PAGE_SIZE,
	);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

	const renderSpinner = () => (
		<div className={styles.loading}>
			<Spinner size="lg" />
		</div>
	);

	if (connectionLoading) {
		return (
			<>
				{topbar}
				{renderSpinner()}
			</>
		);
	}

	const renderShell = (body: ReactNode) => (
		<>
			{topbar}
			<Stack gap="lg" animated>
				<PageHero
					size="md"
					as="h2"
					ruled={false}
					className={styles.hero}
					eyebrow={`Activity · ${String(total).padStart(2, "0")} ${
						total === 1 ? "commit" : "commits"
					} tracked`}
					title="Every push, captured in"
					accent="context"
					description="We watch your repos for shippable moments — captured artifacts, drafted posts, and the misses worth knowing about."
				/>
				{body}
			</Stack>
		</>
	);

	if (!connection) {
		return renderShell(
			<EmptyState
				icon={<AppIcon icon={Github} size="xl" />}
				title={trimTrailingPeriod("GitHub isn't connected")}
				description="Connect your GitHub account in Settings → Platforms to start watching for new commits."
				actions={
					<Button variant="primary" href="/account?tab=platforms">
						Connect GitHub
					</Button>
				}
			/>,
		);
	}

	if (loading && commits.length === 0) {
		return renderShell(renderSpinner());
	}

	if (commits.length === 0) {
		return renderShell(
			<EmptyState
				icon={<AppIcon icon={GitCommit} size="xl" />}
				title={trimTrailingPeriod("No commits yet")}
				description="Push to a watched repository and it'll show up here within seconds."
			/>,
		);
	}

	return renderShell(
		<>
			<Table<GitHubCommitSummary>
				label="Commits"
				size="sm"
				columns={commitColumns((page - 1) * PAGE_SIZE)}
				data={commits}
				onRowClick={(commit) =>
					navigate({ to: "/github/$id", params: { id: commit.id } })
				}
			/>
			{totalPages > 1 && (
				<Stack align="center">
					<Pagination
						page={page}
						total={totalPages}
						onChange={setPage}
						size="sm"
						disabled={loading}
					/>
				</Stack>
			)}
		</>,
	);
}
