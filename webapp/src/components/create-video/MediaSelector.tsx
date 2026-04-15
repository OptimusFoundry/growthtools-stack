import { ImagePlus, X } from "lucide-react";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { MediaItem } from "@/types/media";
import { isImageType } from "@/types/media";
import styles from "./MediaSelector.module.scss";

interface MediaSelectorProps {
	selectedMedia: MediaItem[];
	onAdd: () => void;
	onRemove: (id: string) => void;
	disabled?: boolean;
}

export function MediaSelector({
	selectedMedia,
	onAdd,
	onRemove,
	disabled,
}: MediaSelectorProps) {
	return (
		<div className={styles.container}>
			<Text size="sm" weight="medium">
				Media (optional)
			</Text>
			<Text size="xs" color="secondary">
				Add images or videos to include in your scenes
			</Text>
			<div className={styles.strip}>
				{selectedMedia.map((item) => (
					<div key={item.id} className={styles.thumb}>
						{isImageType(item.contentType) ? (
							<img
								src={item.url}
								alt={item.altText ?? item.filename}
								className={styles.thumbImage}
							/>
						) : (
							<video
								src={item.url}
								className={styles.thumbImage}
								muted
							/>
						)}
						<button
							type="button"
							className={styles.removeBtn}
							onClick={() => onRemove(item.id)}
							disabled={disabled}
							aria-label={`Remove ${item.filename}`}
						>
							<X size={12} />
						</button>
					</div>
				))}
				<button
					type="button"
					className={styles.addBtn}
					onClick={onAdd}
					disabled={disabled}
					aria-label="Add media"
				>
					<ImagePlus size={20} />
				</button>
			</div>
		</div>
	);
}
