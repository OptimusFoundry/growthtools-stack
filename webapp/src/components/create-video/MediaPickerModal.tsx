import { ImagePlus, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useMedia } from "@/hooks/useMedia";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import type { MediaItem } from "@/types/media";
import { isImageType, isVideoType } from "@/types/media";
import styles from "./MediaPickerModal.module.scss";

interface MediaPickerModalProps {
	isOpen: boolean;
	onClose: () => void;
	selectedIds: Set<string>;
	onConfirm: (items: MediaItem[]) => void;
}

export function MediaPickerModal({
	isOpen,
	onClose,
	selectedIds,
	onConfirm,
}: MediaPickerModalProps) {
	const { media, loading, error, refetch } = useMedia({ limit: 100 });
	const { uploadMedia, loading: uploading, error: uploadError } = useUploadMedia();
	const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Sync selectedIds when modal opens
	const prevOpenRef = useRef(false);
	if (isOpen && !prevOpenRef.current) {
		setLocalSelected(new Set(selectedIds));
	}
	prevOpenRef.current = isOpen;

	const toggleItem = useCallback((id: string) => {
		setLocalSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleConfirm = useCallback(() => {
		const selected = media.filter((m) => localSelected.has(m.id));
		onConfirm(selected);
	}, [media, localSelected, onConfirm]);

	const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const uploaded = await uploadMedia(file);
			setLocalSelected((prev) => new Set([...prev, uploaded.id]));
			refetch();
		} catch {
			// error handled by hook
		}

		// Reset input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [uploadMedia, refetch]);

	const mediaItems = media.filter(
		(m) => isImageType(m.contentType) || isVideoType(m.contentType),
	);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Select Media"
			size="lg"
			footer={
				<div className={styles.footer}>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleConfirm} disabled={localSelected.size === 0}>
						Add Selected ({localSelected.size})
					</Button>
				</div>
			}
		>
			<div className={styles.content}>
				<div className={styles.toolbar}>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,video/*"
						onChange={handleUpload}
						className={styles.hiddenInput}
					/>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
						isLoading={uploading}
					>
						<Upload size={14} />
						Upload
					</Button>
				</div>

				{(error || uploadError) && (
					<Alert variant="error">{error || uploadError}</Alert>
				)}

				{loading ? (
					<div className={styles.loadingState}>
						<Spinner />
					</div>
				) : mediaItems.length === 0 ? (
					<div className={styles.emptyState}>
						<ImagePlus size={32} />
						<Text color="secondary">No media files yet. Upload one to get started.</Text>
					</div>
				) : (
					<div className={styles.grid}>
						{mediaItems.map((item) => (
							<button
								key={item.id}
								type="button"
								className={`${styles.gridItem} ${localSelected.has(item.id) ? styles.selected : ""}`}
								onClick={() => toggleItem(item.id)}
							>
								{isImageType(item.contentType) ? (
									<img
										src={item.url}
										alt={item.altText ?? item.filename}
										className={styles.thumbnail}
									/>
								) : (
									<video
										src={item.url}
										className={styles.thumbnail}
										muted
									/>
								)}
								{localSelected.has(item.id) && (
									<div className={styles.checkmark}>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
											<polyline points="20 6 9 17 4 12" />
										</svg>
									</div>
								)}
								<Text size="xs" className={styles.filename}>
									{item.filename}
								</Text>
							</button>
						))}
					</div>
				)}
			</div>
		</Modal>
	);
}
