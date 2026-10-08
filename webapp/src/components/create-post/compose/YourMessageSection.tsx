import { TextArea } from "@/proto-design-system/components/forms/TextArea/TextArea";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text/Text";

interface YourMessageSectionProps {
	blurb: string;
	onBlurbChange: (blurb: string) => void;
	readOnly?: boolean;
}

export function YourMessageSection({
	blurb,
	onBlurbChange,
	readOnly,
}: YourMessageSectionProps) {
	return (
		<Stack gap="sm">
			<Text size="md" weight="semibold">
				Idea or Instructions for post
			</Text>
			<TextArea
				placeholder="What do you want to share? Describe your topic, achievement, or idea..."
				rows={6}
				value={blurb}
				onChange={(e) => onBlurbChange(e.target.value)}
				fullWidth
				required
				disabled={readOnly}
			/>
		</Stack>
	);
}
