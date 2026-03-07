import { ChevronDown, ImageIcon } from "lucide-react";
import { useState } from "react";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import { PlatformPostCard } from "./PlatformPostCard";
import styles from "./ThreadView.module.scss";

interface ThreadViewProps {
	platform: PlatformType;
	segments: ThreadSegment[];
	uploadedMedia?: MediaItem[];
	onSegmentChange: (index: number, content: string) => void;
}

function ThreadImageThumbnail({ media }: { media: MediaItem }) {
	return (
		<div className={styles.imageThumbnail}>
			{media.s3Url ? (
				<img src={media.s3Url} alt="Attached" className={styles.thumbnailImg} />
			) : (
				<div className={styles.thumbnailPlaceholder}>
					<ImageIcon size={16} />
					<Text size="xs" color="muted">
						Image
					</Text>
				</div>
			)}
		</div>
	);
}

export function ThreadView({
	platform,
	segments,
	uploadedMedia,
	onSegmentChange,
}: ThreadViewProps) {
	const [expanded, setExpanded] = useState(false);
	const remaining = segments.length - 1;

	const getMediaForSegment = (seg: ThreadSegment): MediaItem | undefined => {
		if (seg.image_index == null || !uploadedMedia) return undefined;
		return uploadedMedia[seg.image_index - 1];
	};

	if (segments.length <= 1) {
		const media = segments[0] ? getMediaForSegment(segments[0]) : undefined;
		return (
			<div>
				<PlatformPostCard
					platform={platform}
					content={segments[0]?.content ?? ""}
					onChange={(content) => onSegmentChange(0, content)}
				/>
				{media && <ThreadImageThumbnail media={media} />}
			</div>
		);
	}

	return (
		<div className={styles.thread}>
			<div>
				<PlatformPostCard
					platform={platform}
					content={segments[0].content}
					onChange={(content) => onSegmentChange(0, content)}
				/>
				{getMediaForSegment(segments[0]) && (
					<ThreadImageThumbnail media={getMediaForSegment(segments[0])!} />
				)}
			</div>

			<button
				type="button"
				className={styles.toggle}
				onClick={() => setExpanded((prev) => !prev)}
				aria-expanded={expanded}
			>
				<ChevronDown
					className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ""}`}
				/>
				{expanded ? "Collapse thread" : `Show ${remaining} more`}
			</button>

			<div
				className={`${styles.collapsible} ${expanded ? styles.collapsibleExpanded : ""}`}
			>
				<div className={styles.collapsibleInner}>
					<div className={styles.segments}>
						{segments.slice(1).map((segment, i) => {
							const media = getMediaForSegment(segment);
							return (
								<div
									key={`${platform}-segment-${i + 1}`}
									className={styles.segment}
									style={
										{
											"--platform-accent": platformAccent(platform),
										} as React.CSSProperties
									}
								>
									<PlatformPostCard
										platform={platform}
										content={segment.content}
										onChange={(content) => onSegmentChange(i + 1, content)}
									/>
									{media && <ThreadImageThumbnail media={media} />}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

function platformAccent(platform: PlatformType): string {
	const accents: Record<PlatformType, string> = {
		x: "#000",
		linkedin: "#0A66C2",
		bluesky: "#0085FF",
		facebook: "#1877F2",
		instagram: "#E4405F",
		threads: "#000",
		tiktok: "#000",
		pinterest: "#E60023",
	};
	return accents[platform];
}
