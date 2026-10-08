import { motion } from "motion/react";
import { Stepper } from "@/proto-design-system/components/forms/Stepper/Stepper";
import { Switch } from "@/proto-design-system/components/forms/Switch/Switch";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text/Text";
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

	const handleContentTypeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
		onContentTypeChange(e.target.checked ? "thread" : "text");
	};

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
				<motion.div
					className={`${styles.lengthField} ${contentType !== "thread" ? styles.lengthDisabled : ""}`}
					aria-hidden={contentType !== "thread"}
					animate={{ opacity: contentType === "thread" ? 1 : 0 }}
					initial={false}
					transition={{ duration: 0.18, ease: "easeOut" }}
				>
					<div className={styles.field}>
						<Text size="sm">Thread length</Text>
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
						disabled={readOnly || contentType !== "thread"}
						aria-label="Thread length"
					/>
				</motion.div>
			</div>
		</Stack>
	);
}
