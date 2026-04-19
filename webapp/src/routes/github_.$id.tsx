import { createFileRoute, Link } from "@tanstack/react-router";
import {
	GitCommit,
	GitBranch as Github,
	Image as ImageIcon,
	RefreshCw,
} from "lucide-react";
import { ArtifactGrid } from "@/components/github/ArtifactGrid";
import { CaptureMetaCard } from "@/components/github/CaptureMetaCard";
import { Topbar } from "@/components/Layout/Topbar";
import { useGitHubCommit } from "@/hooks/useGitHubCommit";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./github-details.module.scss";

export const Route = createFileRoute("/github_/$id")({
	component: CommitDetailsPage,
});

function CommitDetailsPage() {
	const { id } = Route.useParams();
	const { commit, loading, retryCapture, retrying, retryError } =
		useGitHubCommit(id);

	if (loading && !commit) {
		return (
			<>
				<CommitTopbar />
				<Stack gap="lg" className={styles.page} animate>
					<Stack align="center" justify="center" className={styles.loading}>
						<Spinner size="lg" />
					</Stack>
				</Stack>
			</>
		);
	}

	if (!commit) {
		return (
			<>
				<CommitTopbar />
				<Stack gap="lg" className={styles.page} animate>
					<EmptyState
						icon={<GitCommit size={48} />}
						title="Commit not found"
						description="We couldn't find this commit — the link may be stale or belong to a disconnected repo."
					/>
				</Stack>
			</>
		);
	}

	const firstLine = commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
	const output = commit.capture_output;
	const hasAnyMedia = (output?.uploaded ?? []).length > 0;
	const isSkipped = Boolean(commit.skipped_reason);
	const isWaiting = !isSkipped && !commit.capture_requested_at;

	return (
		<>
			<CommitTopbar label={firstLine} />
			<Stack gap="lg" className={styles.page} animate>
				<CaptureMetaCard commit={commit} />

				{isSkipped && (
					<Alert variant="warning" title="Capture skipped">
						{commit.skipped_reason}
					</Alert>
				)}

				{isWaiting && (
					<Alert variant="info" title="Waiting for capture">
						This commit hasn't been queued for capture yet. It'll pick up on the
						next pipeline run.
					</Alert>
				)}

				{!isSkipped && output?.error && (
					<Alert variant="error" title="Capture failed">
						<Stack gap="sm">
							<span>{output.error}</span>
							{retryError && <span>Retry failed: {retryError}</span>}
							<Stack direction="row" gap="sm">
								<Button
									variant="primary"
									size="sm"
									onClick={retryCapture}
									disabled={retrying}
									leftIcon={<RefreshCw size={14} />}
								>
									{retrying ? "Retrying…" : "Retry capture"}
								</Button>
							</Stack>
						</Stack>
					</Alert>
				)}

				{!output?.error &&
					commit.capture_requested_at &&
					!commit.processed_at && (
						<Alert variant="info" title="Capture in progress">
							The capture worker is processing this commit. Refresh in a moment
							to see results.
						</Alert>
					)}

				{((commit.post_id && !commit.post_deleted) ||
					(commit.blog_post_id && !commit.blog_deleted)) && (
					<Stack direction="row" gap="sm">
						{commit.post_id && !commit.post_deleted && (
							<Link to="/posts/$id" params={{ id: commit.post_id }}>
								<Button variant="primary" size="sm">
									View generated post →
								</Button>
							</Link>
						)}
						{commit.blog_post_id && !commit.blog_deleted && (
							<Link to="/blog/$id" params={{ id: commit.blog_post_id }}>
								<Button variant="secondary" size="sm">
									View generated blog →
								</Button>
							</Link>
						)}
					</Stack>
				)}

				{commit.post_id && commit.post_deleted && (
					<Alert variant="info" title="Post deleted">
						The draft post created from this commit was deleted.
					</Alert>
				)}

				{commit.blog_post_id && commit.blog_deleted && (
					<Alert variant="info" title="Blog post deleted">
						The draft blog post created from this commit was deleted.
					</Alert>
				)}

				{!hasAnyMedia && !output?.error && !isSkipped && !isWaiting && (
					<EmptyState
						icon={<ImageIcon size={48} />}
						title="No artifacts yet"
						description="The capture worker hasn't uploaded any media for this commit."
					/>
				)}

				{hasAnyMedia && <ArtifactGrid uploads={output?.uploaded ?? []} />}
			</Stack>
		</>
	);
}

function CommitTopbar({ label }: { label?: string } = {}) {
	const trail = label && label.length > 60 ? `${label.slice(0, 60)}…` : label;
	return (
		<Topbar
			breadcrumbs={[
				{ label: "GitHub", href: "/github", icon: <Github size={18} /> },
				{ label: trail ?? "Commit" },
			]}
		/>
	);
}
