import { Badge } from "@/proto-design-system/components/primitives/Badge";
import type { MediaItem } from "@/types/media";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "../PlatformPostCard.module.scss";
import { EditableContent } from "./EditableContent";
import { MediaGrid } from "./MediaGrid";

interface GenericPostCardProps {
	platform: PlatformType;
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}

export function GenericPostCard({
	platform,
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: GenericPostCardProps) {
	const displayName = PLATFORM_DISPLAY_NAMES[platform];
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform={platform}>
			<div className={styles.genericHeader}>
				<span className={styles.dot} />
				<span className={styles.genericHandle}>@you</span>
				<span className={styles.genericPlatformName}>{displayName}</span>
			</div>
			<div className={styles.genericBody}>
				<EditableContent
					content={content}
					onChange={onChange}
					platform={platform}
					className={styles.editableContent}
					readOnly={readOnly}
				/>
			</div>
			{media && media.length > 0 && <MediaGrid media={media} />}
			<div className={styles.genericFooter}>
				<Badge variant={isOver ? "error" : "default"} size="sm">
					{content.length} / {charLimit}
				</Badge>
			</div>
		</div>
	);
}
