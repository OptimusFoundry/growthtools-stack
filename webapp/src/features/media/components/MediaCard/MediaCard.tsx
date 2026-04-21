import { FileIcon, Trash2 } from "lucide-react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import styles from "@/routes/media.module.scss";
import {
	formatFileSize,
	isImageType,
	isVideoType,
	type MediaItem,
} from "@/types/media";

export interface MediaCardProps {
	item: MediaItem;
	/** Optional — omit to hide the delete button until the endpoint exists. */
	onDelete?: (id: string) => void;
}

export function MediaCard({ item, onDelete }: MediaCardProps) {
	const ext = item.contentType.split("/")[1]?.toUpperCase() ?? "FILE";
	return (
		<div className={styles.mediaCard}>
			<div className={styles.thumbnail}>
				{isImageType(item.contentType) ? (
					<img
						src={item.url}
						alt={item.altText ?? item.filename}
						className={styles.thumbnailImage}
					/>
				) : isVideoType(item.contentType) ? (
					<video
						src={item.url}
						controls
						preload="metadata"
						className={styles.thumbnailImage}
						aria-label={item.altText ?? item.filename}
					>
						<track kind="captions" />
					</video>
				) : (
					<div className={styles.filePlaceholder}>
						<FileIcon size={32} />
					</div>
				)}
			</div>
			<div className={styles.mediaInfo}>
				<Stack gap="xs">
					<span className={styles.filename} title={item.filename}>
						{item.filename}
					</span>
					<Stack direction="row" gap="xs" align="center">
						<Badge variant="outline" size="sm">
							{ext}
						</Badge>
						<span className={styles.fileSize}>
							{formatFileSize(item.sizeBytes)}
						</span>
					</Stack>
				</Stack>
				<Button
					variant="ghost"
					size="sm"
					onClick={onDelete ? () => onDelete(item.id) : undefined}
					aria-label={`Delete ${item.filename}`}
				>
					<Trash2 size={14} />
				</Button>
			</div>
		</div>
	);
}
