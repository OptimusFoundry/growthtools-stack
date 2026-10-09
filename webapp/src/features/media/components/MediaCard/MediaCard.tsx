import { Badge, Button } from "@optimusfoundry/quiet";
import { FileIcon, Trash2 } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import {
	formatFileSize,
	isImageType,
	isVideoType,
	type MediaItem,
} from "@/types/media";
import styles from "./MediaCard.module.scss";

export interface MediaCardProps {
	item: MediaItem;
	/** Optional — omit to hide the delete button until the endpoint exists. */
	onDelete?: (id: string) => void;
}

function Thumbnail({ item }: { item: MediaItem }) {
	const label = item.altText ?? item.filename;
	if (isImageType(item.contentType)) {
		return <img src={item.url} alt={label} className={styles.thumbnailMedia} />;
	}
	if (isVideoType(item.contentType)) {
		return (
			<video
				src={item.url}
				controls
				preload="metadata"
				className={styles.thumbnailMedia}
				aria-label={label}
			>
				<track kind="captions" />
			</video>
		);
	}
	return (
		<div className={styles.filePlaceholder}>
			<AppIcon icon={FileIcon} size="xl" />
		</div>
	);
}

export function MediaCard({ item, onDelete }: MediaCardProps) {
	const ext = item.contentType.split("/")[1]?.toUpperCase() ?? "FILE";
	return (
		<div className={styles.card}>
			<div className={styles.thumbnail}>
				<Thumbnail item={item} />
			</div>
			<div className={styles.info}>
				<div className={styles.details}>
					<span className={styles.filename} title={item.filename}>
						{item.filename}
					</span>
					<div className={styles.meta}>
						<Badge variant="outline" size="sm">
							{ext}
						</Badge>
						<span className={styles.fileSize}>
							{formatFileSize(item.sizeBytes)}
						</span>
					</div>
				</div>
				<Button
					variant="ghost"
					size="sm"
					icon={<AppIcon icon={Trash2} />}
					onClick={onDelete ? () => onDelete(item.id) : undefined}
					aria-label={`Delete ${item.filename}`}
				/>
			</div>
		</div>
	);
}
