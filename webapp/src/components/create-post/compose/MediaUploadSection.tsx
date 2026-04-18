import type {
	ExistingFile,
	UploadedFile,
} from "@/proto-design-system/components/composite/FileUpload";
import { FileUpload } from "@/proto-design-system/components/composite/FileUpload";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";

interface MediaUploadSectionProps {
	pendingFiles: UploadedFile[];
	existingMedia: ExistingFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveExisting: (id: string) => void;
}

export function MediaUploadSection({
	pendingFiles,
	existingMedia,
	onFilesChange,
	onRemoveExisting,
}: MediaUploadSectionProps) {
	return (
		<Stack gap="sm">
			<Text size="md" weight="semibold">
				Media
			</Text>
			<FileUpload
				accept="image/*,video/*"
				multiple
				maxSize={50 * 1024 * 1024}
				maxFiles={10}
				files={pendingFiles}
				onFilesChange={onFilesChange}
				existingFiles={existingMedia}
				onRemoveExisting={onRemoveExisting}
				label="Drag & drop files here"
				description="or click to browse"
			/>
		</Stack>
	);
}
