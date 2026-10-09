import { Button, Grid } from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useCallback, useRef } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { ResourceListPage } from "@/components/patterns/ResourceListPage/ResourceListPage";
import { MediaCard } from "@/features/media/components/MediaCard/MediaCard";
import { MediaEmpty } from "@/features/media/components/MediaEmpty/MediaEmpty";
import { MediaHero } from "@/features/media/components/MediaHero/MediaHero";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMedia } from "@/hooks/useMedia";
import { useUploadMedia } from "@/hooks/useUploadMedia";
import styles from "./media.module.scss";

export const Route = createFileRoute("/media")({
	component: MediaPage,
});

function MediaPage() {
	useDocumentTitle("Media");
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
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,video/*"
				onChange={handleFileChange}
				className={styles.hiddenInput}
				aria-label="Upload media file"
			/>
			<ResourceListPage
				title="Media"
				topbarAction={
					<Button
						variant="primary"
						size="sm"
						onClick={handleUploadClick}
						loading={uploading}
						leftIcon={<AppIcon icon={Upload} />}
					>
						Upload
					</Button>
				}
				hero={<MediaHero count={media.length} />}
				loading={loading}
				items={media}
				empty={<MediaEmpty onUpload={handleUploadClick} />}
				renderContainer={(children) => (
					<Grid minChildWidth={200} gap="md" rowGap="md">
						{children}
					</Grid>
				)}
				renderItem={(item) => <MediaCard key={item.id} item={item} />}
			/>
		</>
	);
}
