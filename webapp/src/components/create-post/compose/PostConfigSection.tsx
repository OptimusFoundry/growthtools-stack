import { useCallback } from "react";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PLATFORM_SUPPORTS_THREADS, type PlatformType } from "@/types/platform";
import styles from "../CreatePostWizard.module.scss";
import type { WizardContentType } from "../useCreatePostWizard";

interface PostConfigSectionProps {
	contentType: WizardContentType;
	selectedPlatforms: PlatformType[];
	maxThreadParts: number;
	onContentTypeChange: (contentType: WizardContentType) => void;
	onMaxThreadPartsChange: (value: number) => void;
	readOnly?: boolean;
}

export function PostConfigSection({
	contentType,
	selectedPlatforms,
	maxThreadParts,
	onContentTypeChange,
	onMaxThreadPartsChange,
	readOnly,
}: PostConfigSectionProps) {
	const threadSupported = selectedPlatforms.some(
		(p) => PLATFORM_SUPPORTS_THREADS[p],
	);

	const handleContentTypeToggle = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onContentTypeChange(e.target.checked ? "thread" : "text");
		},
		[onContentTypeChange],
	);

	if (!threadSupported) return null;

	return (
		<Stack gap="sm">
			<Text size="md" weight="semibold">
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
					<div className={styles.threadLengthField}>
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
	);
}
