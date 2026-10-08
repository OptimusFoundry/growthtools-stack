import { Badge } from "@/proto-design-system/components/primitives/Badge/Badge";
import type { MediaItem } from "@/types/media";
import styles from "../PlatformPostCard.module.scss";
import { EditableContent } from "./EditableContent";
import { MediaGrid } from "./MediaGrid";
import {
	IconBookmark,
	IconHeart,
	IconReply,
	IconRepost,
	IconShare,
	VerifiedBadge,
	XLogo,
} from "./PlatformIcons";

interface XPostCardProps {
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}

export function XPostCard({
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: XPostCardProps) {
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform="x">
			<div className={styles.xPost}>
				<div className={styles.avatarCol}>
					<div className={styles.avatar}>
						<span className={styles.avatarInitial}>Y</span>
					</div>
				</div>
				<div className={styles.contentCol}>
					<div className={styles.xHeader}>
						<span className={styles.displayName}>You</span>
						<VerifiedBadge color="#1d9bf0" />
						<span className={styles.handleGray}>@you</span>
						<span className={styles.separator}>·</span>
						<span className={styles.timestamp}>now</span>
						<XLogo className={styles.platformLogo} />
					</div>
					<EditableContent
						content={content}
						onChange={onChange}
						platform="x"
						className={styles.editableContent}
						readOnly={readOnly}
					/>
					{media && media.length > 0 && <MediaGrid media={media} />}
					<div className={styles.xActions}>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconReply />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconRepost />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconHeart />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBookmark />
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
