import { useCallback } from "react";
import { Stepper } from "@/proto-design-system/components/forms/Stepper";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PLATFORM_SUPPORTS_THREADS, type PlatformType } from "@/types/platform";
import type { WizardContentType } from "../useCreatePostWizard";
import styles from "./PostConfigSection.module.scss";

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
		<Stack gap="md">
			<Text size="md" weight="semibold">
				Post Config
			</Text>
			<div className={styles.row}>
				<Switch
					label="Thread mode"
					description="Generate as multi-part posts"
					checked={contentType === "thread"}
					onChange={handleContentTypeToggle}
					size="sm"
					disabled={readOnly}
				/>
				{contentType === "thread" && (
					<div className={styles.lengthField}>
						<div className={styles.field}>
							<Text size="sm" weight="medium">
								Thread length
							</Text>
							<Text size="xs" color="muted">
								3–25 posts
							</Text>
						</div>
						<Stepper
							value={maxThreadParts}
							onChange={onMaxThreadPartsChange}
							min={3}
							max={25}
							size="md"
							disabled={readOnly}
							aria-label="Thread length"
						/>
					</div>
				)}
			</div>
		</Stack>
	);
}
