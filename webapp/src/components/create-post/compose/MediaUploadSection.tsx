import { SectionHeader } from "@optimusfoundry/quiet";
import { MediaUpload } from "@/components/MediaUpload/MediaUpload";
import type { MediaItem } from "@/types/media";
import type { PendingUpload } from "@/types/mediaUpload";

interface MediaUploadSectionProps {
	pendingFiles: PendingUpload[];
	existingMedia: MediaItem[];
	onFilesChange: (files: PendingUpload[]) => void;
	onRemoveExisting: (id: string) => void;
	featuredImageId?: string;
	onSetFeatured?: (id: string) => void;
}

export function MediaUploadSection({
	pendingFiles,
	existingMedia,
	onFilesChange,
	onRemoveExisting,
	featuredImageId,
	onSetFeatured,
}: MediaUploadSectionProps) {
	return (
		<section aria-label="Media">
			<SectionHeader size="sm" as="h2" title="Media" />
			<MediaUpload
				accept="image/*,video/*"
				maxSize={50 * 1024 * 1024}
				maxFiles={10}
				pendingFiles={pendingFiles}
				existingMedia={existingMedia}
				onFilesChange={onFilesChange}
				onRemoveExisting={onRemoveExisting}
				featuredId={featuredImageId}
				onSetFeatured={onSetFeatured}
			/>
		</section>
	);
}
