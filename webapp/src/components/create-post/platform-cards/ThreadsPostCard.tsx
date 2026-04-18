import { Badge } from "@/proto-design-system/components/primitives/Badge";
import type { MediaItem } from "@/types/media";
import styles from "../PlatformPostCard.module.scss";
import { EditableContent } from "./EditableContent";
import { MediaGrid } from "./MediaGrid";
import {
	IconHeart,
	IconReply,
	IconRepost,
	IconShare,
	ThreadsLogo,
	VerifiedBadge,
} from "./PlatformIcons";

interface ThreadsPostCardProps {
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}

export function ThreadsPostCard({
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: ThreadsPostCardProps) {
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform="threads">
			<div className={styles.xPost}>
				<div className={styles.avatarCol}>
					<div className={styles.avatar}>
						<span className={styles.avatarInitial}>Y</span>
					</div>
				</div>
				<div className={styles.contentCol}>
					<div className={styles.xHeader}>
						<span className={styles.displayName}>you</span>
						<VerifiedBadge color="#000" />
						<span className={styles.timestamp}>now</span>
						<ThreadsLogo className={styles.platformLogo} />
					</div>
					<EditableContent
						content={content}
						onChange={onChange}
						platform="threads"
						className={styles.editableContent}
						readOnly={readOnly}
					/>
					{media && media.length > 0 && <MediaGrid media={media} />}
					<div className={styles.threadsActions}>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconHeart />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconReply />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconRepost />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconShare />
						</button>
						<div className={styles.charBadge}>
							<Badge variant={isOver ? "error" : "default"} size="sm">
								{content.length} / {charLimit}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
