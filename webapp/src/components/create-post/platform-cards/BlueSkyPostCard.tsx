import { Badge } from "@optimusfoundry/quiet";
import type { MediaItem } from "@/types/media";
import styles from "../PlatformPostCard.module.scss";
import { EditableContent } from "./EditableContent";
import { MediaGrid } from "./MediaGrid";
import {
	BlueSkyLogo,
	IconBskyHeart,
	IconBskyMore,
	IconBskyReply,
	IconBskyRepost,
} from "./PlatformIcons";

interface BlueSkyPostCardProps {
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}

export function BlueSkyPostCard({
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: BlueSkyPostCardProps) {
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform="bluesky">
			<div className={styles.xPost}>
				<div className={styles.avatarCol}>
					<div className={styles.avatar}>
						<span className={styles.avatarInitial}>Y</span>
					</div>
				</div>
				<div className={styles.contentCol}>
					<div className={styles.xHeader}>
						<span className={styles.displayName}>You</span>
						<span className={styles.handleGray}>@you.bsky.social</span>
						<span className={styles.separator}>·</span>
						<span className={styles.timestamp}>now</span>
						<BlueSkyLogo className={styles.platformLogo} />
					</div>
					<EditableContent
						content={content}
						onChange={onChange}
						platform="bluesky"
						className={styles.editableContent}
						readOnly={readOnly}
					/>
					{media && media.length > 0 && <MediaGrid media={media} />}
					<div className={styles.xActions}>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyReply />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyRepost />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyHeart />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyMore />
						</button>
						<div className={styles.charBadge}>
							<Badge
								variant={isOver ? "error" : "default"}
								size="sm"
								dot={false}
							>
								{content.length} / {charLimit}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
