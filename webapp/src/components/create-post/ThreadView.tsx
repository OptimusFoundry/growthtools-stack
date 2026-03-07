import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
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

export function ThreadView({
	platform,
	segments,
	uploadedMedia,
	onSegmentChange,
}: ThreadViewProps) {
	const [expanded, setExpanded] = useState(false);
	const remaining = segments.length - 1;

	const getMediaForSegment = (seg: ThreadSegment): MediaItem[] => {
		if (seg.image_index == null || !uploadedMedia) return [];
		const item = uploadedMedia[seg.image_index - 1];
		return item ? [item] : [];
	};

	if (segments.length <= 1) {
		const media = segments[0] ? getMediaForSegment(segments[0]) : [];
		return (
			<PlatformPostCard
				platform={platform}
				content={segments[0]?.content ?? ""}
				onChange={(content) => onSegmentChange(0, content)}
				media={media.length > 0 ? media : undefined}
			/>
		);
	}

	return (
		<div className={styles.thread}>
			<PlatformPostCard
				platform={platform}
				content={segments[0].content}
				onChange={(content) => onSegmentChange(0, content)}
				media={
					getMediaForSegment(segments[0]).length > 0
						? getMediaForSegment(segments[0])
						: undefined
				}
			/>

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
										media={media.length > 0 ? media : undefined}
									/>
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
