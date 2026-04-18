import type {
	ExistingFile,
	UploadedFile,
} from "@/proto-design-system/components/composite/FileUpload";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import type { PlatformType } from "@/types/platform";
import styles from "../CreatePostWizard.module.scss";
import type { PublishMode, WizardContentType } from "../useCreatePostWizard";
import { MediaUploadSection } from "./MediaUploadSection";
import { PlatformSelectionSection } from "./PlatformSelectionSection";
import { PostConfigSection } from "./PostConfigSection";
import { PublishModeSection } from "./PublishModeSection";
import { YourMessageSection } from "./YourMessageSection";

export interface ComposeStepProps {
	blurb: string;
	contentType: WizardContentType;
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	pendingFiles: UploadedFile[];
	existingMedia: ExistingFile[];
	onRemoveExistingMedia: (id: string) => void;
	/** True when the attached media set changed after the last successful
	 * generation. Drives the "regenerate before publishing" banner. */
	mediaChanged?: boolean;
	maxThreadParts: number;
	generating: boolean;
	generated: boolean;
	publishMode: PublishMode;
	scheduledAt: string;
	submitting: boolean;
	savingDraft: boolean;
	readOnly?: boolean;
	onBlurbChange: (blurb: string) => void;
	onContentTypeChange: (contentType: WizardContentType) => void;
	onMaxThreadPartsChange: (value: number) => void;
	onTogglePlatform: (platform: PlatformType) => void;
	onFilesChange: (files: UploadedFile[]) => void;
	onGenerate: () => void;
	onSetPublishMode: (mode: PublishMode) => void;
	onSetScheduledAt: (scheduledAt: string) => void;
	onPublish: () => void;
	onSchedule: () => void;
	onSaveDraft: () => void;
}

/**
 * ComposeStep is a container that renders the form sections for creating/editing a post.
 * It orchestrates the blurb input, platform selection, post config, media upload, and publish mode.
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
	generating,
	generated,
	publishMode,
	scheduledAt,
	submitting,
	savingDraft,
	readOnly = false,
	onBlurbChange,
	onContentTypeChange,
	onMaxThreadPartsChange,
	onTogglePlatform,
	onFilesChange,
	onGenerate,
	onSetPublishMode,
	onSetScheduledAt,
	onPublish,
	onSchedule,
	onSaveDraft,
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
						gap="sm"
						justify="end"
						className={styles.actions}
					>
						<Button
							variant="primary"
							onClick={onGenerate}
							disabled={!canGenerate || generating}
							isLoading={generating}
						>
							{generated ? "Regenerate" : "Generate Content"}
						</Button>
					</Stack>
				</>
			)}

			{generated && !readOnly && (
				<PublishModeSection
					publishMode={publishMode}
					scheduledAt={scheduledAt}
					submitting={submitting}
					savingDraft={savingDraft}
					selectedPlatformsCount={selectedPlatforms.length}
					regenerateWarningVisible={regenerateWarningVisible}
					regenerateWarningMessage={regenerateWarningMessage}
					platformsChanged={platformsChanged}
					onSetPublishMode={onSetPublishMode}
					onSetScheduledAt={onSetScheduledAt}
					onPublish={onPublish}
					onSchedule={onSchedule}
					onSaveDraft={onSaveDraft}
				/>
			)}
		</Stack>
	);
}
