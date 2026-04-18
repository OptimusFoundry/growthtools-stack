import { Download, FileText, Film, Image as ImageIcon } from "lucide-react";
import { memo, useMemo } from "react";
import type { GitHubCaptureUploaded } from "@/hooks/useGitHubCommits";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Grid } from "@/proto-design-system/components/layout/Grid";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./artifacts.module.scss";

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
// Component
// ============================================================================

interface ArtifactGridProps {
	uploads: GitHubCaptureUploaded[];
}

export const ArtifactGrid = memo(function ArtifactGrid({
	uploads,
}: ArtifactGridProps) {
	const buckets = useMemo(() => bucketUploads(uploads), [uploads]);

	return (
		<Stack gap="md">
			{buckets.images.length > 0 && <ImagesSection images={buckets.images} />}
			{buckets.videos.length > 0 && <VideoSection videos={buckets.videos} />}
			{buckets.metadata.length > 0 && (
				<MetadataSection files={buckets.metadata} />
			)}
		</Stack>
	);
});

ArtifactGrid.displayName = "ArtifactGrid";

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
