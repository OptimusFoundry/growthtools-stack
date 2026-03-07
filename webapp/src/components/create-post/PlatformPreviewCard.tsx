import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import { PlatformPostCard } from "./PlatformPostCard";
import { ThreadView } from "./ThreadView";

interface PlatformPreviewCardProps {
	platform: PlatformType;
	content: string;
	threadSegments?: ThreadSegment[];
	isThread: boolean;
	uploadedMedia?: MediaItem[];
	onContentChange: (content: string) => void;
	onThreadSegmentChange: (index: number, content: string) => void;
}

export function PlatformPreviewCard({
	platform,
	content,
	threadSegments,
	isThread,
	uploadedMedia,
	onContentChange,
	onThreadSegmentChange,
}: PlatformPreviewCardProps) {
	if (isThread && threadSegments && threadSegments.length > 0) {
		return (
			<ThreadView
				platform={platform}
				segments={threadSegments}
				uploadedMedia={uploadedMedia}
				onSegmentChange={onThreadSegmentChange}
			/>
		);
	}

	return (
		<PlatformPostCard
			platform={platform}
			content={content}
			onChange={onContentChange}
			media={uploadedMedia}
		/>
	);
}
