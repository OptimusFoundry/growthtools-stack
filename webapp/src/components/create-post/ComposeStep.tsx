import { useCallback } from "react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import type { UploadedFile } from "@/proto-design-system/components/composite/FileUpload";
import { FileUpload } from "@/proto-design-system/components/composite/FileUpload";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import {
	PLATFORM_DISPLAY_NAMES,
	PLATFORM_SUPPORTS_THREADS,
	type PlatformType,
} from "@/types/platform";
import styles from "./CreatePostWizard.module.scss";
import type { WizardContentType } from "./useCreatePostWizard";

interface ComposeStepProps {
	blurb: string;
	contentType: WizardContentType;
	selectedPlatforms: PlatformType[];
	pendingFiles: UploadedFile[];
	generating: boolean;
	generated: boolean;
	onBlurbChange: (blurb: string) => void;
	onContentTypeChange: (contentType: WizardContentType) => void;
	onTogglePlatform: (platform: PlatformType) => void;
	onFilesChange: (files: UploadedFile[]) => void;
	onGenerate: () => void;
}

export function ComposeStep({
	blurb,
	contentType,
	selectedPlatforms,
	pendingFiles,
	generating,
	generated,
	onBlurbChange,
	onContentTypeChange,
	onTogglePlatform,
	onFilesChange,
	onGenerate,
}: ComposeStepProps) {
	const { connections } = usePlatformConnections();
	const activeConnections = connections.filter((c) => c.status === "active");

	const canGenerate = blurb.trim().length > 0 && selectedPlatforms.length > 0;

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
		<Stack gap="md">
			{/* Blurb */}
			<TextArea
				label="Your message"
				placeholder="What do you want to share? Describe your topic, achievement, or idea..."
				rows={6}
				value={blurb}
				onChange={(e) => onBlurbChange(e.target.value)}
				fullWidth
				required
			/>

			{/* Platforms — inline tags */}
			<Stack gap="sm">
				<Text size="sm" weight="medium">
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
							/>
						))}
					</Stack>
				) : (
					<Text size="sm" color="secondary">
						No connected platforms. Connect platforms in Settings.
					</Text>
				)}
			</Stack>

			<Divider />

			{/* Post config */}
			{threadSupported && (
				<Stack gap="sm">
					<Text size="sm" weight="medium">
						Post Config
					</Text>
					<Switch
						label="Thread mode"
						description="Generate as multi-part posts"
						checked={contentType === "thread"}
						onChange={handleContentTypeToggle}
						size="sm"
					/>
				</Stack>
			)}

			{threadSupported && <Divider />}

			{/* Media */}
			<Stack gap="sm">
				<Text size="sm" weight="medium">
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

			<Divider />

			{/* Actions */}
			<Stack direction="row" gap="sm" justify="end" className={styles.actions}>
				<Button
					variant="primary"
					onClick={onGenerate}
					disabled={!canGenerate || generating}
					isLoading={generating}
				>
					{generated ? "Regenerate" : "Generate Content"}
				</Button>
			</Stack>
		</Stack>
	);
}
