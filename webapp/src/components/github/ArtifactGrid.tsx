import {
	Badge,
	Grid,
	Link,
	SectionHeader,
	Stack,
	Text,
} from "@optimusfoundry/quiet";
import { Download, FileText } from "lucide-react";
import { memo, useMemo } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import type { GitHubCaptureUploaded } from "@/hooks/useGitHubCommits";
import styles from "./artifacts.module.scss";

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

interface ArtifactGridProps {
	uploads: GitHubCaptureUploaded[];
}

export const ArtifactGrid = memo(function ArtifactGrid({
	uploads,
}: ArtifactGridProps) {
	const buckets = useMemo(() => bucketUploads(uploads), [uploads]);

	return (
		<Stack gap="xl">
			{buckets.images.length > 0 && <ImagesSection images={buckets.images} />}
			{buckets.videos.length > 0 && <VideoSection videos={buckets.videos} />}
			{buckets.metadata.length > 0 && (
				<MetadataSection files={buckets.metadata} />
			)}
		</Stack>
	);
});

ArtifactGrid.displayName = "ArtifactGrid";

interface ImagesSectionProps {
	images: GitHubCaptureUploaded[];
}

const ImagesSection = memo(function ImagesSection({
	images,
}: ImagesSectionProps) {
	return (
		<Stack gap="lg">
			<SectionHeader
				size="sm"
				as="h2"
				title="Images"
				actions={<CountBadge count={images.length} />}
			/>
			<Grid minChildWidth={256} gap="xs" rowGap="xs">
				{images.map((img) => (
					<a
						key={img.key}
						href={img.url ?? undefined}
						target="_blank"
						rel="noreferrer"
						className={styles.imageCard}
					>
						<img src={img.url ?? ""} alt={basename(img.key)} loading="lazy" />
						<span className={styles.imageCaption}>{basename(img.key)}</span>
					</a>
				))}
			</Grid>
		</Stack>
	);
});

ImagesSection.displayName = "ImagesSection";

interface VideoSectionProps {
	videos: GitHubCaptureUploaded[];
}

const VideoSection = memo(function VideoSection({ videos }: VideoSectionProps) {
	return (
		<Stack gap="lg">
			<SectionHeader
				size="sm"
				as="h2"
				title="Video"
				actions={<CountBadge count={videos.length} />}
			/>
			<Stack gap="lg">
				{videos.map((video) => (
					<Stack key={video.key} gap="xs">
						<video
							className={styles.videoPlayer}
							src={video.url ?? undefined}
							controls
							preload="metadata"
						>
							<source src={video.url ?? ""} type={videoMime(video.key)} />
						</video>
						<Stack direction="row" align="center" justify="space-between">
							<Text size="sm" color="muted">
								{basename(video.key)}
							</Text>
							{video.url && (
								<Link href={video.url} external variant="muted" size="sm">
									Download
								</Link>
							)}
						</Stack>
					</Stack>
				))}
			</Stack>
		</Stack>
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
		<Stack gap="lg">
			<SectionHeader
				size="sm"
				as="h2"
				title="Metadata"
				actions={<CountBadge count={files.length} />}
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
						<AppIcon icon={FileText} size="md" />
						<span className={styles.metadataName}>{basename(file.key)}</span>
						<AppIcon icon={Download} size="md" color="muted" />
					</a>
				))}
			</Stack>
		</Stack>
	);
});

MetadataSection.displayName = "MetadataSection";

function CountBadge({ count }: { count: number }) {
	return (
		<Badge variant="secondary" size="sm">
			{count}
		</Badge>
	);
}
