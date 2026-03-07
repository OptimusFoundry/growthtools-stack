import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs/Tabs";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import { PlatformPreviewCard } from "./PlatformPreviewCard";
import type {
	GenerationStatus,
	PublishMode,
	WizardContentType,
} from "./useCreatePostWizard";

interface PreviewStepProps {
	selectedPlatforms: PlatformType[];
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, string[]>>;
	contentType: WizardContentType;
	generationProgress: Partial<Record<PlatformType, GenerationStatus>>;
	generating: boolean;
	generated: boolean;
	publishMode: PublishMode;
	scheduledAt: string;
	submitting: boolean;
	onUpdateContent: (platform: PlatformType, content: string) => void;
	onUpdateThreadSegment: (
		platform: PlatformType,
		index: number,
		content: string,
	) => void;
	onSetPublishMode: (mode: PublishMode) => void;
	onSetScheduledAt: (scheduledAt: string) => void;
	onPublish: () => void;
	onSchedule: () => void;
}

function StatusIcon({ status }: { status: GenerationStatus }) {
	switch (status) {
		case "done":
			return <CheckCircle size={18} className={styles.statusDone} />;
		case "error":
			return <AlertCircle size={18} className={styles.statusError} />;
		case "generating":
			return <Loader size={18} className={styles.statusGenerating} />;
		default:
			return <div className={styles.statusPending} />;
	}
}

function statusLabel(status: GenerationStatus): string {
	switch (status) {
		case "done":
			return "Done";
		case "error":
			return "Failed";
		case "generating":
			return "Generating...";
		default:
			return "Waiting";
	}
}

function statusVariant(
	status: GenerationStatus,
): "success" | "error" | "warning" | "default" {
	switch (status) {
		case "done":
			return "success";
		case "error":
			return "error";
		case "generating":
			return "warning";
		default:
			return "default";
	}
}

export function PreviewStep({
	selectedPlatforms,
	platformContent,
	threadContent,
	contentType,
	generationProgress,
	generating,
	generated,
	publishMode,
	scheduledAt,
	submitting,
	onUpdateContent,
	onUpdateThreadSegment,
	onSetPublishMode,
	onSetScheduledAt,
	onPublish,
	onSchedule,
}: PreviewStepProps) {
	const isThread = contentType === "thread";

	// State 1: Not yet generated
	if (!generating && !generated) {
		return (
			<div className={styles.previewPanel}>
				<EmptyState
					title="Preview"
					description="Generate content to see platform-adapted previews here"
				/>
			</div>
		);
	}

	// State 2: Generating — show progress per platform with streaming text
	if (generating) {
		return (
			<div className={styles.previewPanel}>
				<Stack gap="md">
					<Text as="h3" size="lg" weight="medium">
						Generating content...
					</Text>

					<div className={styles.progressList}>
						{selectedPlatforms.map((platform) => {
							const status = generationProgress[platform] ?? "pending";
							return (
								<div key={platform} className={styles.progressRow}>
									<StatusIcon status={status} />
									<Text
										size="sm"
										weight="medium"
										className={styles.progressPlatform}
									>
										{PLATFORM_DISPLAY_NAMES[platform]}
									</Text>
									<Badge variant={statusVariant(status)} size="sm">
										{statusLabel(status)}
									</Badge>
								</div>
							);
						})}
					</div>
				</Stack>
			</div>
		);
	}

	// State 3: Generated — tabs + publish
	return (
		<div className={styles.previewPanel}>
			<Stack gap="md">
				<Text as="h3" size="lg" weight="medium">
					Review Content
				</Text>

				<Tabs defaultTab={selectedPlatforms[0]}>
					<TabList aria-label="Platform previews">
						{selectedPlatforms.map((platform) => (
							<Tab key={platform} id={platform}>
								{PLATFORM_DISPLAY_NAMES[platform]}
							</Tab>
						))}
					</TabList>
					<TabPanels>
						{selectedPlatforms.map((platform) => (
							<TabPanel key={platform} id={platform}>
								<div className={styles.tabPanelContent}>
									<PlatformPreviewCard
										platform={platform}
										content={platformContent[platform] ?? ""}
										threadSegments={threadContent[platform]}
										isThread={isThread}
										onContentChange={(content) =>
											onUpdateContent(platform, content)
										}
										onThreadSegmentChange={(index, content) =>
											onUpdateThreadSegment(platform, index, content)
										}
									/>
								</div>
							</TabPanel>
						))}
					</TabPanels>
				</Tabs>

				<Divider />

				{/* Publish options */}
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

				<Stack gap="sm">
					{publishMode === "now" && (
						<Button
							variant="primary"
							onClick={onPublish}
							isLoading={submitting}
							disabled={submitting}
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
							disabled={submitting}
						>
							Schedule Post
						</Button>
					)}
					{!publishMode && (
						<Text size="sm" color="secondary">
							Choose how you want to publish above
						</Text>
					)}
				</Stack>
			</Stack>
		</div>
	);
}
