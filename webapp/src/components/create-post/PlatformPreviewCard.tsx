import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import {
	PLATFORM_CHAR_LIMITS,
	PLATFORM_DISPLAY_NAMES,
	type PlatformType,
} from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";

interface PlatformPreviewCardProps {
	platform: PlatformType;
	content: string;
	threadSegments?: string[];
	isThread: boolean;
	onContentChange: (content: string) => void;
	onThreadSegmentChange: (index: number, content: string) => void;
}

function CharCounter({ current, limit }: { current: number; limit: number }) {
	const isOver = current > limit;
	return (
		<Badge variant={isOver ? "error" : "default"} size="sm">
			{current} / {limit}
		</Badge>
	);
}

export function PlatformPreviewCard({
	platform,
	content,
	threadSegments,
	isThread,
	onContentChange,
	onThreadSegmentChange,
}: PlatformPreviewCardProps) {
	const charLimit = PLATFORM_CHAR_LIMITS[platform];
	const displayName = PLATFORM_DISPLAY_NAMES[platform];

	if (isThread && threadSegments && threadSegments.length > 0) {
		return (
			<Stack gap="md">
				{threadSegments.map((segment, index) => (
					<div
						key={`${platform}-segment-${index}`}
						className={styles.threadSegment}
					>
						<div className={styles.segmentHeader}>
							<span className={styles.segmentNumber}>
								{displayName} - Part {index + 1}
							</span>
							<CharCounter current={segment.length} limit={charLimit} />
						</div>
						<TextArea
							rows={4}
							value={segment}
							onChange={(e) => onThreadSegmentChange(index, e.target.value)}
						/>
					</div>
				))}
			</Stack>
		);
	}

	return (
		<Stack gap="sm">
			<div className={styles.previewHeader}>
				<span className={styles.previewPlatformName}>{displayName}</span>
				<CharCounter current={content.length} limit={charLimit} />
			</div>
			<TextArea
				rows={6}
				value={content}
				onChange={(e) => onContentChange(e.target.value)}
			/>
		</Stack>
	);
}
