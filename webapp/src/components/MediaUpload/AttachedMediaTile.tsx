import { AspectRatio, Button } from "@optimusfoundry/quiet";
import { FileIcon, Star, X } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import {
	formatFileSize,
	isImageType,
	isVideoType,
	type MediaItem,
} from "@/types/media";
import styles from "./AttachedMediaTile.module.scss";

interface AttachedMediaTileProps {
	media: MediaItem;
	featured: boolean;
	onRemove: (id: string) => void;
	onSetFeatured?: (id: string) => void;
	disabled?: boolean;
}

function Thumb({ media }: { media: MediaItem }) {
	if (isImageType(media.contentType)) {
		return (
			<img className={styles.media} src={media.url} alt={media.filename} />
		);
	}
	if (isVideoType(media.contentType)) {
		return (
			<video
				className={styles.media}
				src={media.url}
				aria-label={media.filename}
				muted
				preload="metadata"
			/>
		);
	}
	return (
		<span className={styles.fallback}>
			<AppIcon icon={FileIcon} size="lg" color="muted" />
		</span>
	);
}

export function AttachedMediaTile({
	media,
	featured,
	onRemove,
	onSetFeatured,
	disabled,
}: AttachedMediaTileProps) {
	const canFeature =
		onSetFeatured !== undefined && isImageType(media.contentType);

	return (
		<div className={featured ? styles.tileFeatured : styles.tile}>
			<div className={styles.thumb}>
				<AspectRatio ratio="square">
					<Thumb media={media} />
				</AspectRatio>
			</div>
			<div className={styles.footer}>
				<span className={styles.file}>
					<span className={styles.name}>{media.filename}</span>
					<span className={styles.meta}>{formatFileSize(media.sizeBytes)}</span>
				</span>
				<span className={styles.actions}>
					{canFeature && (
						<Button
							variant="ghost"
							size="sm"
							icon={<AppIcon icon={Star} size="sm" />}
							aria-label={
								featured
									? `${media.filename} is the featured image`
									: `Set ${media.filename} as featured image`
							}
							disabled={disabled}
							onClick={() => onSetFeatured(media.id)}
						/>
					)}
					<Button
						variant="ghost"
						size="sm"
						icon={<AppIcon icon={X} size="sm" />}
						aria-label={`Remove ${media.filename}`}
						disabled={disabled}
						onClick={() => onRemove(media.id)}
					/>
				</span>
			</div>
		</div>
	);
}
