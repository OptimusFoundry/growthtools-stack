import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoAspectRatio } from "@/types/video";

const ASPECT_RATIO_OPTIONS: { value: VideoAspectRatio; label: string }[] = [
	{ value: "9:16", label: "9:16 (Vertical)" },
	{ value: "1:1", label: "1:1 (Square)" },
	{ value: "16:9", label: "16:9 (Landscape)" },
];

interface ComposeStepProps {
	title: string;
	prompt: string;
	aspectRatio: VideoAspectRatio;
	generating: boolean;
	configExists: boolean;
	rendering: boolean;
	activeJobId: string | null;
	generateError: string | null;
	renderError: string | null;
	onTitleChange: (title: string) => void;
	onPromptChange: (prompt: string) => void;
	onAspectRatioChange: (ratio: VideoAspectRatio) => void;
	onGenerate: () => void;
	onRender: () => void;
}

export function ComposeStep({
	title,
	prompt,
	aspectRatio,
	generating,
	configExists,
	rendering,
	activeJobId,
	generateError,
	renderError,
	onTitleChange,
	onPromptChange,
	onAspectRatioChange,
	onGenerate,
	onRender,
}: ComposeStepProps) {
	const canGenerate = title.trim().length > 0 && prompt.trim().length > 0;
	const error = generateError || renderError;

	return (
		<Stack gap="md">
			<TextField
				label="Title"
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				placeholder="e.g. Product Launch Announcement"
				disabled={generating}
			/>

			<TextArea
				label="Content / Prompt"
				value={prompt}
				onChange={(e) => onPromptChange(e.target.value)}
				placeholder="Describe your video content or paste text from an existing post..."
				rows={6}
				fullWidth
				disabled={generating}
			/>

			<Divider />

			<Stack gap="sm">
				<Text size="sm" weight="medium">
					Aspect Ratio
				</Text>
				<Stack direction="row" gap="sm">
					{ASPECT_RATIO_OPTIONS.map((option) => (
						<Button
							key={option.value}
							variant={aspectRatio === option.value ? "primary" : "secondary"}
							size="sm"
							onClick={() => onAspectRatioChange(option.value)}
							disabled={generating}
						>
							{option.label}
						</Button>
					))}
				</Stack>
			</Stack>

			<Divider />

			{error && <Alert variant="error">{error}</Alert>}

			<Button
				variant="primary"
				onClick={onGenerate}
				disabled={!canGenerate || generating}
				isLoading={generating}
			>
				{configExists ? "Regenerate Config" : "Generate Config"}
			</Button>

			{configExists && !activeJobId && (
				<Button
					variant="primary"
					onClick={onRender}
					disabled={rendering}
					isLoading={rendering}
				>
					Start Render
				</Button>
			)}
		</Stack>
	);
}
