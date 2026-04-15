import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import type { MediaItem } from "@/types/media";
import { DurationPicker } from "./StylePicker";
import { MediaSelector } from "./MediaSelector";

interface ComposeStepProps {
	title: string;
	prompt: string;
	duration: number | null;
	generating: boolean;
	configExists: boolean;
	generateError: string | null;
	selectedMedia: MediaItem[];
	onTitleChange: (title: string) => void;
	onPromptChange: (prompt: string) => void;
	onDurationChange: (duration: number | null) => void;
	onAddMedia: () => void;
	onRemoveMedia: (id: string) => void;
	onGenerate: () => void;
}

export function ComposeStep({
	title,
	prompt,
	duration,
	generating,
	configExists,
	generateError,
	selectedMedia,
	onTitleChange,
	onPromptChange,
	onDurationChange,
	onAddMedia,
	onRemoveMedia,
	onGenerate,
}: ComposeStepProps) {
	const canGenerate = title.trim().length > 0 && prompt.trim().length > 0;

	return (
		<Stack gap="md">
			<DurationPicker
				selectedDuration={duration}
				onDurationChange={onDurationChange}
				disabled={generating}
			/>

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
				rows={4}
				fullWidth
				disabled={generating}
			/>

			<MediaSelector
				selectedMedia={selectedMedia}
				onAdd={onAddMedia}
				onRemove={onRemoveMedia}
				disabled={generating}
			/>

			<Divider />

			{generateError && <Alert variant="error">{generateError}</Alert>}

			<Button
				variant="primary"
				onClick={onGenerate}
				disabled={!canGenerate || generating}
				isLoading={generating}
			>
				{configExists ? "Regenerate Video" : "Generate Video"}
			</Button>
		</Stack>
	);
}
