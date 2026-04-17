import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Download,
	ExternalLink,
	FileText,
	Film,
	GitCommit,
	Github,
	Image as ImageIcon,
} from "lucide-react";
import { memo, useMemo } from "react";
import {
	type GitHubCaptureUploaded,
	type GitHubCommit,
	useGitHubCommits,
} from "@/hooks/useGitHubCommits";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Grid } from "@/proto-design-system/components/layout/Grid";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./github-details.module.scss";

export const Route = createFileRoute("/github_/$id")({
	component: CommitDetailsPage,
});

// ============================================================================
// Helpers
// ============================================================================

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const VIDEO_RE = /\.(mp4|webm|mov|m4v)$/i;

function basename(key: string): string {
	return key.split("/").pop() ?? key;
}

function videoMime(key: string): string {
	const ext = key.toLowerCase().split(".").pop() ?? "";
	if (ext === "webm") return "video/webm";
	if (ext === "mov") return "video/quicktime";
	return "video/mp4";
}

interface BucketedUploads {
	images: GitHubCaptureUploaded[];
	videos: GitHubCaptureUploaded[];
	metadata: GitHubCaptureUploaded[];
}

function bucketUploads(uploads: GitHubCaptureUploaded[]): BucketedUploads {
	const images: GitHubCaptureUploaded[] = [];
	const videos: GitHubCaptureUploaded[] = [];
	const metadata: GitHubCaptureUploaded[] = [];
	for (const item of uploads) {
		if (!item.url) continue;
		if (IMAGE_RE.test(item.key)) images.push(item);
		else if (VIDEO_RE.test(item.key)) videos.push(item);
		else metadata.push(item);
	}
	return { images, videos, metadata };
}

// ============================================================================
// Route component
// ============================================================================

function CommitDetailsPage() {
	const { id } = Route.useParams();
	const { connection, loading: connectionLoading } = useGitHubConnection();
	const { commits, loading } = useGitHubCommits(!!connection, 200);

	const commit = useMemo(() => commits.find((c) => c.id === id), [commits, id]);

	if (connectionLoading || (loading && commits.length === 0)) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<CommitBreadcrumb />
				<Divider />
				<Stack align="center" justify="center" className={styles.loading}>
					<Spinner size="lg" />
				</Stack>
			</Stack>
		);
	}

	if (!commit) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<CommitBreadcrumb />
				<Divider />
				<EmptyState
					icon={<GitCommit size={48} />}
					title="Commit not found"
					description="This commit isn't in your recent activity — it may have scrolled off."
				/>
			</Stack>
		);
	}

	return <CommitDetails commit={commit} />;
}

// ============================================================================
// Commit details
// ============================================================================

interface CommitDetailsProps {
	commit: GitHubCommit;
}

const CommitDetails = memo(function CommitDetails({
	commit,
}: CommitDetailsProps) {
	const firstLine = commit.message.split("\n")[0] ?? commit.sha.slice(0, 7);
	const restOfMessage = commit.message.split("\n").slice(1).join("\n").trim();
	const repoLabel =
		commit.repo_owner && commit.repo_name
			? `${commit.repo_owner}/${commit.repo_name}`
			: "";

	const output = commit.capture_output;
	const buckets = useMemo(
		() => bucketUploads(output?.uploaded ?? []),
		[output?.uploaded],
	);
	const hasAnyMedia =
		buckets.images.length + buckets.videos.length + buckets.metadata.length > 0;

	return (
		<Stack gap="lg" className={styles.page} animate>
			<CommitBreadcrumb label={firstLine} />
			<Divider />

			<Stack gap="sm">
				<Stack direction="row" align="center" gap="sm" wrap>
					<Text as="h1" size="2xl" weight="bold">
						{firstLine}
					</Text>
					{commit.post_id && (
						<Badge variant="primary" size="sm">
							Post created
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

			{output?.error && (
				<Alert variant="error" title="Capture failed">
					{output.error}
				</Alert>
			)}

			{commit.post_id && (
				<div>
					<Link to="/posts/$id" params={{ id: commit.post_id }}>
						<Button variant="primary" size="sm">
							View generated post →
						</Button>
					</Link>
				</div>
			)}

			{!hasAnyMedia && !output?.error && (
				<EmptyState
					icon={<ImageIcon size={48} />}
					title="No artifacts yet"
					description="The capture worker hasn't uploaded any media for this commit."
				/>
			)}

			{buckets.images.length > 0 && <ImagesSection images={buckets.images} />}
			{buckets.videos.length > 0 && <VideoSection videos={buckets.videos} />}
			{buckets.metadata.length > 0 && (
				<MetadataSection files={buckets.metadata} />
			)}
		</Stack>
	);
});

CommitDetails.displayName = "CommitDetails";

// ============================================================================
// Sections
// ============================================================================

interface ImagesSectionProps {
	images: GitHubCaptureUploaded[];
}

const ImagesSection = memo(function ImagesSection({
	images,
}: ImagesSectionProps) {
	return (
		<Card padding="md">
			<Stack gap="md">
				<SectionHeader
					icon={<ImageIcon size={16} />}
					title="Images"
					count={images.length}
				/>
				<Grid columns="auto" gap="sm">
					{images.map((img) => (
						<a
							key={img.key}
							href={img.url ?? undefined}
							target="_blank"
							rel="noreferrer"
							className={styles.imageCard}
						>
							<img src={img.url ?? ""} alt={basename(img.key)} loading="lazy" />
							<div className={styles.imageCaption}>{basename(img.key)}</div>
						</a>
					))}
				</Grid>
			</Stack>
		</Card>
	);
});

ImagesSection.displayName = "ImagesSection";

interface VideoSectionProps {
	videos: GitHubCaptureUploaded[];
}

const VideoSection = memo(function VideoSection({ videos }: VideoSectionProps) {
	return (
		<Card padding="md">
			<Stack gap="md">
				<SectionHeader
					icon={<Film size={16} />}
					title="Video"
					count={videos.length}
				/>
				<Stack gap="md">
					{videos.map((video) => (
						<div key={video.key} className={styles.videoCard}>
							<video
								className={styles.videoPlayer}
								src={video.url ?? undefined}
								controls
								preload="metadata"
							>
								<source src={video.url ?? ""} type={videoMime(video.key)} />
							</video>
							<div className={styles.videoMeta}>
								<Text size="sm" color="muted">
									{basename(video.key)}
								</Text>
								{video.url && (
									<a
										href={video.url}
										target="_blank"
										rel="noreferrer"
										className={styles.downloadLink}
									>
										<Download size={12} />
										Download
									</a>
								)}
							</div>
						</div>
					))}
				</Stack>
			</Stack>
		</Card>
	);
});

VideoSection.displayName = "VideoSection";

interface MetadataSectionProps {
	files: GitHubCaptureUploaded[];
}

const MetadataSection = memo(function MetadataSection({
	files,
}: MetadataSectionProps) {
	return (
		<Card padding="md">
			<Stack gap="md">
				<SectionHeader
					icon={<FileText size={16} />}
					title="Metadata"
					count={files.length}
				/>
				<Stack gap="xs">
					{files.map((file) => (
						<a
							key={file.key}
							href={file.url ?? undefined}
							target="_blank"
							rel="noreferrer"
							className={styles.metadataRow}
						>
							<FileText size={14} />
							<span className={styles.metadataName}>{basename(file.key)}</span>
							<Download size={14} className={styles.metadataIcon} />
						</a>
					))}
				</Stack>
			</Stack>
		</Card>
	);
});

MetadataSection.displayName = "MetadataSection";

// ============================================================================
// Bits
// ============================================================================

interface CommitBreadcrumbProps {
	label?: string;
}

function CommitBreadcrumb({ label }: CommitBreadcrumbProps = {}) {
	const trail = label && label.length > 60 ? `${label.slice(0, 60)}…` : label;
	return (
		<Breadcrumb
			size="lg"
			items={[
				{ label: "GitHub", href: "/github", icon: <Github size={18} /> },
				{ label: trail ?? "Commit" },
			]}
		/>
	);
}

interface SectionHeaderProps {
	icon: React.ReactNode;
	title: string;
	count: number;
}

function SectionHeader({ icon, title, count }: SectionHeaderProps) {
	return (
		<div className={styles.sectionHeader}>
			<span className={styles.sectionTitle}>
				{icon}
				<Text size="sm" weight="semibold">
					{title}
				</Text>
			</span>
			<Badge variant="secondary" size="sm">
				{count}
			</Badge>
		</div>
	);
}
