import { Col, Grid } from "@optimusfoundry/quiet";
import { ImageIcon } from "lucide-react";
import { isVideoType, type MediaItem } from "@/types/media";
import styles from "../PlatformPostCard.module.scss";

interface MediaGridProps {
	media: MediaItem[];
}

interface CellLayout {
	span: number;
	rowSpan?: number;
	aspectClass?: string;
}

// Platform-style tiling: 1 wide, 2 tall pair, 3 = tall left + two squares, 4 = 2x2.
function cellLayout(count: number, index: number): CellLayout {
	if (count === 1) return { span: 12, aspectClass: styles.aspectWide };
	if (count === 2) return { span: 6, aspectClass: styles.aspectTall };
	if (count === 3) {
		return index === 0
			? { span: 6, rowSpan: 2 }
			: { span: 6, aspectClass: styles.aspectSquare };
	}
	return { span: 6, aspectClass: styles.aspectWide };
}

function MediaTile({ item }: { item: MediaItem }) {
	if (!item.url) {
		return (
			<div className={styles.mediaGridPlaceholder}>
				<ImageIcon size={24} />
			</div>
		);
	}
	if (isVideoType(item.contentType)) {
		return (
			<video
				src={item.url}
				controls
				preload="metadata"
				className={styles.mediaGridImg}
				aria-label={item.altText ?? item.filename}
			>
				<track kind="captions" />
			</video>
		);
	}
	return (
		<img
			src={item.url}
			alt={item.altText ?? item.filename}
			className={styles.mediaGridImg}
		/>
	);
}

export function MediaGrid({ media }: MediaGridProps) {
	if (media.length === 0) return null;

	return (
		<div className={styles.mediaGrid}>
			{/* The preview rail is under 720 wide, so spanMd/spanSm are explicit or every cell would collapse to 12. */}
			<Grid columns={12} gap={2} rowGap={2}>
				{media.slice(0, 4).map((item, i) => {
					const { span, rowSpan, aspectClass } = cellLayout(media.length, i);
					return (
						<Col
							key={item.id}
							span={span}
							spanMd={span}
							spanSm={span}
							rowSpan={rowSpan}
							className={[styles.mediaGridItem, aspectClass]
								.filter(Boolean)
								.join(" ")}
						>
							<MediaTile item={item} />
							{media.length > 4 && i === 3 && (
								<div className={styles.mediaGridOverflow}>
									+{media.length - 4}
								</div>
							)}
						</Col>
					);
				})}
			</Grid>
		</div>
	);
}
