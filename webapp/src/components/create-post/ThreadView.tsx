import { Button } from "@optimusfoundry/quiet";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import { PlatformPostCard } from "./platform-cards/PlatformPostCard";
import styles from "./ThreadView.module.scss";

interface ThreadViewProps {
	platform: PlatformType;
	segments: ThreadSegment[];
	uploadedMedia?: MediaItem[];
	readOnly?: boolean;
	onSegmentChange: (index: number, content: string) => void;
}

export function ThreadView({
	platform,
	segments,
	uploadedMedia,
	readOnly,
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
				readOnly={readOnly}
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
				readOnly={readOnly}
			/>

			<div className={styles.toggleRow}>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setExpanded((prev) => !prev)}
					aria-expanded={expanded}
					leftIcon={
						<AppIcon
							icon={ChevronDown}
							className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ""}`}
						/>
					}
				>
					{expanded ? "Collapse thread" : `Show ${remaining} more`}
				</Button>
			</div>

			{expanded && (
				<div className={styles.segments}>
					{segments.slice(1).map((segment, i) => {
						const media = getMediaForSegment(segment);
						return (
							<div
								key={`${platform}-segment-${i + 1}`}
								className={styles.segment}
							>
								<PlatformPostCard
									platform={platform}
									content={segment.content}
									onChange={(content) => onSegmentChange(i + 1, content)}
									media={media.length > 0 ? media : undefined}
									readOnly={readOnly}
								/>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
