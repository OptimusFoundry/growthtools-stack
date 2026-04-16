import { useCallback } from "react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import type { UploadedFile } from "@/proto-design-system/components/composite/FileUpload";
import { FileUpload } from "@/proto-design-system/components/composite/FileUpload";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import {
	PLATFORM_DISPLAY_NAMES,
	PLATFORM_SUPPORTS_THREADS,
	type PlatformType,
} from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import type { PublishMode, WizardContentType } from "./useCreatePostWizard";

interface ComposeStepProps {
	blurb: string;
	contentType: WizardContentType;
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	pendingFiles: UploadedFile[];
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

export function ComposeStep({
	blurb,
	contentType,
	maxThreadParts,
	selectedPlatforms,
	platformContent,
	pendingFiles,
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
	const { connections } = usePlatformConnections();
	const activeConnections = connections.filter((c) => c.status === "active");

	const canGenerate = blurb.trim().length > 0 && selectedPlatforms.length > 0;

	// Detect if platforms changed after generation
	const generatedPlatforms = Object.keys(platformContent) as PlatformType[];
	const platformsChanged =
		generated &&
		generatedPlatforms.length > 0 &&
		(selectedPlatforms.length !== generatedPlatforms.length ||
			selectedPlatforms.some((p) => !platformContent[p]));

	const threadSupported = selectedPlatforms.some(
		(p) => PLATFORM_SUPPORTS_THREADS[p],
	);

	const handleContentTypeToggle = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onContentTypeChange(e.target.checked ? "thread" : "text");
		},
		[onContentTypeChange],
	);

	return (
		<Stack gap="lg">
			{/* Blurb */}
			<TextArea
				label="Your message"
				placeholder="What do you want to share? Describe your topic, achievement, or idea..."
				rows={6}
				value={blurb}
				onChange={(e) => onBlurbChange(e.target.value)}
				fullWidth
				required
				disabled={readOnly}
			/>

			{/* Platforms */}
			<Stack gap="sm">
				<Text size="base" weight="semibold">
					Platforms
				</Text>
				{activeConnections.length > 0 ? (
					<Stack direction="row" gap="md" wrap>
						{activeConnections.map((conn) => (
							<Switch
								key={conn.id}
								label={PLATFORM_DISPLAY_NAMES[conn.platform]}
								checked={selectedPlatforms.includes(conn.platform)}
								onChange={() => onTogglePlatform(conn.platform)}
								size="sm"
								disabled={readOnly}
							/>
						))}
					</Stack>
				) : (
					<Text size="sm" color="secondary">
						No connected platforms. Connect platforms in Settings.
					</Text>
				)}
			</Stack>

			{/* Post config */}
			{threadSupported && (
				<Stack gap="sm">
					<Text size="base" weight="semibold">
						Post Config
					</Text>
					<Switch
						label="Thread mode"
						description="Generate as multi-part posts"
						checked={contentType === "thread"}
						onChange={handleContentTypeToggle}
						size="sm"
						disabled={readOnly}
					/>
					{contentType === "thread" && (
						<Stack direction="row" gap="md" align="end">
							<div style={{ width: "120px" }}>
								<TextField
									label="Thread length"
									type="number"
									value={String(maxThreadParts)}
									onChange={(e) => {
										const val = Number.parseInt(e.target.value, 10);
										if (val >= 3 && val <= 25) onMaxThreadPartsChange(val);
									}}
									helperText="3–25 posts"
									disabled={readOnly}
								/>
							</div>
						</Stack>
					)}
				</Stack>
			)}

			{/* Media — hidden when read-only */}
			{!readOnly && (
				<>
					<Stack gap="sm">
						<Text size="base" weight="semibold">
							Media
						</Text>
						<FileUpload
							accept="image/*,video/*"
							multiple
							maxSize={50 * 1024 * 1024}
							maxFiles={10}
							files={pendingFiles}
							onFilesChange={onFilesChange}
							label="Drag & drop files here"
							description="or click to browse"
						/>
					</Stack>

					
					{/* Generate */}
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

			{/* Publish options — shown after content is generated, hidden when read-only */}
			{generated && !readOnly && (
				<>
					<Text size="base" weight="semibold">
						Publish
					</Text>

					{platformsChanged && (
						<Alert variant="warning">
							Platforms changed since last generation. Regenerate content before
							publishing.
						</Alert>
					)}

					<div className={styles.publishOptions}>
						<label
							className={`${styles.publishOption} ${publishMode === "now" ? styles.publishOptionActive : ""}`}
						>
							<input
								type="radio"
								name="publishMode"
								value="now"
								checked={publishMode === "now"}
								onChange={() => onSetPublishMode("now")}
								disabled={submitting}
							/>
							<div className={styles.publishOptionContent}>
								<Text size="sm" weight="medium">
									Send immediately
								</Text>
								<Text size="xs" color="muted">
									Publish to all selected platforms right now
								</Text>
							</div>
						</label>
						<label
							className={`${styles.publishOption} ${publishMode === "schedule" ? styles.publishOptionActive : ""}`}
						>
							<input
								type="radio"
								name="publishMode"
								value="schedule"
								checked={publishMode === "schedule"}
								onChange={() => onSetPublishMode("schedule")}
								disabled={submitting}
							/>
							<div className={styles.publishOptionContent}>
								<Text size="sm" weight="medium">
									Schedule for later
								</Text>
								<Text size="xs" color="muted">
									Choose a date and time
								</Text>
							</div>
						</label>
					</div>

					{publishMode === "schedule" && (
						<TextField
							type="datetime-local"
							label="Date & Time"
							value={scheduledAt}
							onChange={(e) => onSetScheduledAt(e.target.value)}
						/>
					)}

					<Stack direction="row" gap="sm" justify="end">
						{publishMode === "now" && (
							<Button
								variant="primary"
								onClick={onPublish}
								isLoading={submitting}
								disabled={submitting || platformsChanged}
							>
								Publish to {selectedPlatforms.length} Platform
								{selectedPlatforms.length !== 1 ? "s" : ""}
							</Button>
						)}
						{publishMode === "schedule" && scheduledAt && (
							<Button
								variant="primary"
								onClick={onSchedule}
								isLoading={submitting}
								disabled={submitting || platformsChanged}
							>
								Schedule Post
							</Button>
						)}
						<Button
							variant="ghost"
							onClick={onSaveDraft}
							isLoading={savingDraft}
							disabled={savingDraft || submitting}
						>
							Save as Draft
						</Button>
					</Stack>
				</>
			)}
		</Stack>
	);
}
