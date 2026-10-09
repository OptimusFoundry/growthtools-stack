import { Col, FileUpload, Grid } from "@optimusfoundry/quiet";
import { useRef } from "react";
import { formatFileSize, type MediaItem } from "@/types/media";
import type { PendingUpload } from "@/types/mediaUpload";
import { AttachedMediaTile } from "./AttachedMediaTile";
import styles from "./MediaUpload.module.scss";
import { PendingUploadRow } from "./PendingUploadRow";
import { useUploadIntake } from "./useUploadIntake";

interface MediaUploadProps {
	pendingFiles: PendingUpload[];
	existingMedia: MediaItem[];
	onFilesChange: (files: PendingUpload[]) => void;
	onRemoveExisting: (id: string) => void;
	featuredId?: string;
	onSetFeatured?: (id: string) => void;
	accept?: string;
	maxSize?: number;
	maxFiles?: number;
	disabled?: boolean;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;

export function MediaUpload({
	pendingFiles,
	existingMedia,
	onFilesChange,
	onRemoveExisting,
	featuredId,
	onSetFeatured,
	accept = "image/*,video/*",
	maxSize = DEFAULT_MAX_SIZE,
	maxFiles = DEFAULT_MAX_FILES,
	disabled = false,
}: MediaUploadProps) {
	const { onIntake, limitNote } = useUploadIntake({
		pendingFiles,
		onFilesChange,
		maxFiles,
	});
	const rootRef = useRef<HTMLDivElement>(null);
	const pendingRef = useRef<HTMLUListElement>(null);

	const removePending = (id: string) => {
		const index = pendingFiles.findIndex((upload) => upload.id === id);
		onFilesChange(pendingFiles.filter((upload) => upload.id !== id));
		// The removed row unmounts with the focused button, so hand focus on.
		requestAnimationFrame(() => {
			const buttons = pendingRef.current?.querySelectorAll<HTMLElement>(
				'button[aria-label^="Remove "]',
			);
			const zone =
				rootRef.current?.querySelector<HTMLElement>('[role="button"]');
			(buttons?.[index] ?? buttons?.[index - 1] ?? zone)?.focus();
		});
	};

	return (
		<div ref={rootRef} className={styles.root}>
			<div className={styles.intake}>
				<FileUpload
					variant="dropzone"
					multiple
					accept={accept}
					maxSize={maxSize}
					disabled={disabled}
					hint={`Up to ${formatFileSize(maxSize)} each · max ${maxFiles}`}
					onChange={onIntake}
				/>
			</div>
			<p aria-live="polite" className={styles.note}>
				{limitNote}
			</p>
			{pendingFiles.length > 0 && (
				<ul ref={pendingRef} className={styles.pending}>
					{pendingFiles.map((upload) => (
						<PendingUploadRow
							key={upload.id}
							upload={upload}
							onRemove={removePending}
							disabled={disabled}
						/>
					))}
				</ul>
			)}
			{existingMedia.length > 0 && (
				<section aria-label="Attached media">
					<Grid as="ul" minChildWidth={160} gap="sm" rowGap="sm">
						{existingMedia.map((media) => (
							<Col as="li" key={media.id}>
								<AttachedMediaTile
									media={media}
									featured={media.id === featuredId}
									onRemove={onRemoveExisting}
									onSetFeatured={onSetFeatured}
									disabled={disabled}
								/>
							</Col>
						))}
					</Grid>
				</section>
			)}
		</div>
	);
}
