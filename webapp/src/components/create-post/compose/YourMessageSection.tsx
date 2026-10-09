import { TextArea } from "@optimusfoundry/quiet";

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
		<TextArea
			size="sm"
			label="Idea or Instructions for post"
			placeholder="What do you want to share? Describe your topic, achievement, or idea..."
			rows={6}
			value={blurb}
			onChange={(e) => onBlurbChange(e.target.value)}
			required
			disabled={readOnly}
		/>
	);
}
