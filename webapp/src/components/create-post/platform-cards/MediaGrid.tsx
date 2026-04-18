import { ImageIcon } from "lucide-react";
import { isVideoType, type MediaItem } from "@/types/media";
import styles from "../PlatformPostCard.module.scss";

interface MediaGridProps {
	media: MediaItem[];
}

export function MediaGrid({ media }: MediaGridProps) {
	if (media.length === 0) return null;

	const gridClass =
		media.length === 1
			? styles.mediaGrid1
			: media.length === 2
				? styles.mediaGrid2
				: media.length === 3
					? styles.mediaGrid3
					: styles.mediaGrid4;

	return (
		<div className={`${styles.mediaGrid} ${gridClass}`}>
			{media.slice(0, 4).map((item, i) => (
				<div key={item.id} className={styles.mediaGridItem}>
					{item.url ? (
						isVideoType(item.contentType) ? (
							<video
								src={item.url}
								controls
								preload="metadata"
								className={styles.mediaGridImg}
								aria-label={item.altText ?? item.filename}
							>
								<track kind="captions" />
							</video>
						) : (
							<img
								src={item.url}
								alt={item.altText ?? item.filename}
								className={styles.mediaGridImg}
							/>
						)
					) : (
						<div className={styles.mediaGridPlaceholder}>
							<ImageIcon size={24} />
						</div>
					)}
					{media.length > 4 && i === 3 && (
						<div className={styles.mediaGridOverflow}>+{media.length - 4}</div>
					)}
				</div>
			))}
		</div>
	);
}
