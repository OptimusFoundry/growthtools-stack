import { createFileRoute } from "@tanstack/react-router";
import { FileIcon, ImageIcon, Trash2, Upload } from "lucide-react";
import { useCallback, useRef } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { useMedia } from "@/hooks/useMedia";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { formatFileSize, isImageType, isVideoType } from "@/types/media";
import mediaStyles from "./media.module.scss";
import styles from "./page.module.scss";

export const Route = createFileRoute("/media")({
	component: MediaPage,
});

function MediaPage() {
	const { media, loading, refetch } = useMedia();
	const { uploadMedia, loading: uploading } = useUploadMedia();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleUploadClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			try {
				await uploadMedia(file);
				refetch();
			} catch {
				// error is surfaced via hook state
			}
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[uploadMedia, refetch],
	);

	return (
		<>
			<Topbar
				title="Media"
				eyebrow={`${media.length} item${media.length === 1 ? "" : "s"}`}
				actions={
					<Button
						variant="primary"
						onClick={handleUploadClick}
						isLoading={uploading}
					>
						<Upload size={16} /> Upload
					</Button>
				}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,video/*"
				onChange={handleFileChange}
				className={mediaStyles.hiddenInput}
				aria-label="Upload media file"
			/>
			<Stack gap="lg" className={styles.page} animate>
				<Stack gap="md">
					{loading ? (
						<Spinner />
					) : media.length === 0 ? (
						<EmptyState
							title="No media yet"
							description="Upload images and videos to use in your posts."
							icon={<ImageIcon size={48} />}
							action={
								<Button variant="primary" onClick={handleUploadClick}>
									<Upload size={16} /> Upload Media
								</Button>
							}
						/>
					) : (
						<div className={mediaStyles.mediaGrid}>
							{media.map((item) => (
								<div key={item.id} className={mediaStyles.mediaCard}>
									<div className={mediaStyles.thumbnail}>
										{isImageType(item.contentType) ? (
											<img
												src={item.url}
												alt={item.altText ?? item.filename}
												className={mediaStyles.thumbnailImage}
											/>
										) : isVideoType(item.contentType) ? (
											<video
												src={item.url}
												controls
												preload="metadata"
												className={mediaStyles.thumbnailImage}
												aria-label={item.altText ?? item.filename}
											>
												<track kind="captions" />
											</video>
										) : (
											<div className={mediaStyles.filePlaceholder}>
												<FileIcon size={32} />
											</div>
										)}
									</div>
									<div className={mediaStyles.mediaInfo}>
										<Stack gap="xs">
											<span
												className={mediaStyles.filename}
												title={item.filename}
											>
												{item.filename}
											</span>
											<Stack direction="row" gap="xs" align="center">
												<Badge variant="outline" size="sm">
													{item.contentType.split("/")[1]?.toUpperCase() ??
														"FILE"}
												</Badge>
												<span className={mediaStyles.fileSize}>
													{formatFileSize(item.sizeBytes)}
												</span>
											</Stack>
										</Stack>
										<Button
											variant="ghost"
											size="sm"
											aria-label={`Delete ${item.filename}`}
										>
											<Trash2 size={14} />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</Stack>
			</Stack>
		</>
	);
}
