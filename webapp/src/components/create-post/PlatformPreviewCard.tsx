import type { PlatformType } from "@/types/platform";
import { PlatformPostCard } from "./PlatformPostCard";
import { ThreadView } from "./ThreadView";

interface PlatformPreviewCardProps {
	platform: PlatformType;
	content: string;
	threadSegments?: string[];
	isThread: boolean;
	onContentChange: (content: string) => void;
	onThreadSegmentChange: (index: number, content: string) => void;
}

export function PlatformPreviewCard({
	platform,
	content,
	threadSegments,
	isThread,
	onContentChange,
	onThreadSegmentChange,
}: PlatformPreviewCardProps) {
	if (isThread && threadSegments && threadSegments.length > 0) {
		return (
			<ThreadView
				platform={platform}
				segments={threadSegments}
				onSegmentChange={onThreadSegmentChange}
			/>
		);
	}

	return (
		<PlatformPostCard
			platform={platform}
			content={content}
			onChange={onContentChange}
		/>
	);
}
