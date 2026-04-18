import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "../CreatePostWizard.module.scss";
import type { PublishMode } from "../useCreatePostWizard";

interface PublishModeSectionProps {
	publishMode: PublishMode;
	scheduledAt: string;
	submitting: boolean;
	savingDraft: boolean;
	selectedPlatformsCount: number;
	regenerateWarningVisible: boolean;
	regenerateWarningMessage: string;
	platformsChanged: boolean;
	onSetPublishMode: (mode: PublishMode) => void;
	onSetScheduledAt: (scheduledAt: string) => void;
	onPublish: () => void;
	onSchedule: () => void;
	onSaveDraft: () => void;
}

export function PublishModeSection({
	publishMode,
	scheduledAt,
	submitting,
	savingDraft,
	selectedPlatformsCount,
	regenerateWarningVisible,
	regenerateWarningMessage,
	platformsChanged,
	onSetPublishMode,
	onSetScheduledAt,
	onPublish,
	onSchedule,
	onSaveDraft,
}: PublishModeSectionProps) {
	return (
		<Stack gap="sm">
			<Text size="md" weight="semibold">
				Publish
			</Text>
			{regenerateWarningVisible && (
				<Alert variant="warning">{regenerateWarningMessage}</Alert>
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
						Publish to {selectedPlatformsCount} Platform
						{selectedPlatformsCount !== 1 ? "s" : ""}
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
		</Stack>
	);
}
