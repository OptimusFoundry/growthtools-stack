import {
	Alert,
	Button,
	EmptyState,
	Spinner,
	Stack,
} from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import {
	GitCommit,
	GitBranch as Github,
	Image as ImageIcon,
	RefreshCw,
} from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { ArtifactGrid } from "@/components/github/ArtifactGrid";
import { CaptureMetaCard } from "@/components/github/CaptureMetaCard";
import { Topbar } from "@/components/Layout/Topbar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGitHubCommit } from "@/hooks/useGitHubCommit";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import styles from "./github.module.scss";

export const Route = createFileRoute("/github_/$id")({
	component: CommitDetailsPage,
});

function CommitDetailsPage() {
	useDocumentTitle("Commit");
	const { id } = Route.useParams();
	const { commit, loading, retryCapture, retrying, retryError } =
		useGitHubCommit(id);

	if (loading && !commit) {
		return (
			<>
				<CommitTopbar />
				<div className={styles.loading}>
					<Spinner size="lg" />
				</div>
			</>
		);
	}

	if (!commit) {
		return (
			<>
				<CommitTopbar />
				<Stack gap="lg" animated>
					<EmptyState
						icon={<AppIcon icon={GitCommit} size="xl" />}
						title={trimTrailingPeriod("Commit not found")}
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
	const showPostLink = Boolean(commit.post_id && !commit.post_deleted);
	const showBlogLink = Boolean(commit.blog_post_id && !commit.blog_deleted);

	return (
		<>
			<CommitTopbar label={firstLine} />
			<Stack gap="lg" animated>
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
					<Alert
						variant="error"
						title="Capture failed"
						action={
							<Button
								variant="primary"
								size="sm"
								onClick={retryCapture}
								loading={retrying}
								leftIcon={<AppIcon icon={RefreshCw} size="md" />}
							>
								Retry capture
							</Button>
						}
					>
						<Stack gap="xs">
							<span>{output.error}</span>
							{retryError && <span>Retry failed: {retryError}</span>}
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

				{(showPostLink || showBlogLink) && (
					<Stack direction="row" gap="sm">
						{showPostLink && (
							<Button
								variant="primary"
								size="sm"
								href={`/posts/${commit.post_id}`}
							>
								View generated post →
							</Button>
						)}
						{showBlogLink && (
							<Button
								variant="secondary"
								size="sm"
								href={`/blog/${commit.blog_post_id}`}
							>
								View generated blog →
							</Button>
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
						icon={<AppIcon icon={ImageIcon} size="xl" />}
						title={trimTrailingPeriod("No artifacts yet")}
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
				{
					label: "GitHub",
					href: "/github",
					icon: <AppIcon icon={Github} size="lg" />,
				},
				{ label: trail ?? "Commit" },
			]}
		/>
	);
}
