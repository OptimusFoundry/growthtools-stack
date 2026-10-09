import { Alert, Button, Stack } from "@optimusfoundry/quiet";
import type { MediaItem } from "@/types/media";
import type { PendingUpload } from "@/types/mediaUpload";
import type { PlatformType } from "@/types/platform";
import styles from "../CreatePostWizard.module.scss";
import type { WizardContentType } from "../useCreatePostWizard";
import { MediaUploadSection } from "./MediaUploadSection";
import { PlatformSelectionSection } from "./PlatformSelectionSection";
import { PostConfigSection } from "./PostConfigSection";
import { YourMessageSection } from "./YourMessageSection";

export interface ComposeStepProps {
	blurb: string;
	contentType: WizardContentType;
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	pendingFiles: PendingUpload[];
	existingMedia: MediaItem[];
	onRemoveExistingMedia: (id: string) => void;
	/** True when the attached media set changed after the last successful
	 * generation. Drives the "regenerate before publishing" banner. */
	mediaChanged?: boolean;
	/** True while any pending file is still uploading. Disables Generate. */
	uploading?: boolean;
	maxThreadParts: number;
	generating: boolean;
	generated: boolean;
	readOnly?: boolean;
	onBlurbChange: (blurb: string) => void;
	onContentTypeChange: (contentType: WizardContentType) => void;
	onMaxThreadPartsChange: (value: number) => void;
	onTogglePlatform: (platform: PlatformType) => void;
	onFilesChange: (files: PendingUpload[]) => void;
	onGenerate: () => void;
}

/**
 * ComposeStep is a container that renders the form sections for creating/editing a post.
 * Publish/schedule/save-draft actions live in the Topbar, not in-page.
 */
export function ComposeStep({
	blurb,
	contentType,
	maxThreadParts,
	selectedPlatforms,
	platformContent,
	pendingFiles,
	existingMedia,
	onRemoveExistingMedia,
	mediaChanged = false,
	uploading = false,
	generating,
	generated,
	readOnly = false,
	onBlurbChange,
	onContentTypeChange,
	onMaxThreadPartsChange,
	onTogglePlatform,
	onFilesChange,
	onGenerate,
}: ComposeStepProps) {
	const canGenerate = blurb.trim().length > 0 && selectedPlatforms.length > 0;

	// Detect if platforms changed after generation
	const generatedPlatforms = Object.keys(platformContent) as PlatformType[];
	const platformsChanged =
		generated &&
		generatedPlatforms.length > 0 &&
		(selectedPlatforms.length !== generatedPlatforms.length ||
			selectedPlatforms.some((p) => !platformContent[p]));
	const regenerateWarningVisible =
		generated && (platformsChanged || mediaChanged);
	const regenerateWarningMessage = platformsChanged
		? "Platforms changed since last generation. Regenerate content before publishing."
		: "Media changed since last generation. Regenerate so copy matches what's attached.";

	return (
		<Stack gap="lg">
			<YourMessageSection
				blurb={blurb}
				onBlurbChange={onBlurbChange}
				readOnly={readOnly}
			/>

			<PlatformSelectionSection
				selectedPlatforms={selectedPlatforms}
				onTogglePlatform={onTogglePlatform}
				readOnly={readOnly}
			/>

			<PostConfigSection
				contentType={contentType}
				selectedPlatforms={selectedPlatforms}
				maxThreadParts={maxThreadParts}
				onContentTypeChange={onContentTypeChange}
				onMaxThreadPartsChange={onMaxThreadPartsChange}
				readOnly={readOnly}
			/>

			{!readOnly && (
				<>
					<MediaUploadSection
						pendingFiles={pendingFiles}
						existingMedia={existingMedia}
						onFilesChange={onFilesChange}
						onRemoveExisting={onRemoveExistingMedia}
					/>

					<Stack
						direction="row"
						gap="xs"
						justify="flex-end"
						className={styles.actions}
					>
						<Button
							variant="primary"
							size="sm"
							onClick={onGenerate}
							disabled={!canGenerate || generating || uploading}
							loading={generating}
						>
							{generated ? "Regenerate" : "Generate Content"}
						</Button>
					</Stack>
				</>
			)}

			{generated && !readOnly && regenerateWarningVisible && (
				<RegenerateWarning message={regenerateWarningMessage} />
			)}
		</Stack>
	);
}

function RegenerateWarning({ message }: { message: string }) {
	return <Alert variant="warning">{message}</Alert>;
}
