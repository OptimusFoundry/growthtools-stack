import { createFileRoute, Link } from "@tanstack/react-router";
import {
	GitCommit,
	GitBranch as Github,
	Image as ImageIcon,
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
	const { commit, loading } = useGitHubCommit(id);

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

	return (
		<>
			<CommitTopbar label={firstLine} />
			<Stack gap="lg" className={styles.page} animate>
				<CaptureMetaCard commit={commit} />

				{output?.error && (
					<Alert variant="error" title="Capture failed">
						{output.error}
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

				{!hasAnyMedia && !output?.error && (
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
