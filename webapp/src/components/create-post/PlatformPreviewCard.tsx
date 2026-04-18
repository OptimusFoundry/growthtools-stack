import type { ThreadSegment } from "@/hooks/useSSEContentGenerate";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import { PlatformPostCard } from "./platform-cards/PlatformPostCard";
import { ThreadView } from "./ThreadView";

interface PlatformPreviewCardProps {
	platform: PlatformType;
	content: string;
	threadSegments?: ThreadSegment[];
	isThread: boolean;
	uploadedMedia?: MediaItem[];
	readOnly?: boolean;
	onContentChange: (content: string) => void;
	onThreadSegmentChange: (index: number, content: string) => void;
}

export function PlatformPreviewCard({
	platform,
	content,
	threadSegments,
	isThread,
	uploadedMedia,
	readOnly,
	onContentChange,
	onThreadSegmentChange,
}: PlatformPreviewCardProps) {
	if (isThread && threadSegments && threadSegments.length > 0) {
		return (
			<ThreadView
				platform={platform}
				segments={threadSegments}
				uploadedMedia={uploadedMedia}
				readOnly={readOnly}
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
			readOnly={readOnly}
		/>
	);
}
