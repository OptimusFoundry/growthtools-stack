import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextArea } from "./TextArea";

const meta: Meta<typeof TextArea> = {
	title: "Forms/TextArea",
	component: TextArea,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		resize: {
			control: "select",
			options: ["none", "vertical", "horizontal", "both"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		label: "Project description",
		placeholder: "What is this project for?",
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Public bio",
		placeholder: "Tell customers what your team does",
		helperText: "Shown on your public profile — max 500 characters",
	},
};

export const Required: Story = {
	args: {
		label: "Reason for cancellation",
		placeholder: "Help us understand why you're leaving",
		required: true,
	},
};

export const WithError: Story = {
	args: {
		label: "Incident summary",
		placeholder: "Describe what happened",
		defaultValue: "Server down",
		errorMessage: "Please provide at least 50 characters of detail",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Commit message",
		placeholder: "Fix login redirect bug",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Pull request description",
		placeholder: "Summarize the changes in this PR",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Release notes",
		placeholder: "List every change shipped in this version",
		size: "lg",
	},
};

// =============================================================================
// RESIZE OPTIONS
// =============================================================================

export const NoResize: Story = {
	args: {
		label: "Support ticket message",
		placeholder: "Describe your issue",
		resize: "none",
	},
};

export const ResizeVertical: Story = {
	args: {
		label: "Meeting notes",
		placeholder: "Jot down key takeaways",
		resize: "vertical",
	},
};

export const ResizeBoth: Story = {
	args: {
		label: "SQL query",
		placeholder: "SELECT * FROM orders WHERE status = 'pending'",
		resize: "both",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Internal audit log (read-only)",
		placeholder: "No entries yet",
		disabled: true,
	},
};

export const CustomRows: Story = {
	args: {
		label: "Postmortem write-up",
		placeholder: "Root cause, impact, and remediation steps...",
		rows: 8,
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1.5rem",
				width: "350px",
			}}
		>
			<TextArea
				label="Company bio"
				placeholder="Northwind Traders builds tools for..."
				helperText="Shown on your public profile — max 500 characters"
			/>
			<TextArea
				label="What could we do better?"
				placeholder="Share your thoughts..."
				required
				rows={5}
			/>
			<TextArea
				label="Cancellation reason"
				defaultValue="Too expensive"
				errorMessage="Please provide more detail so we can improve"
			/>
			<TextArea
				label="Audit log (read-only)"
				placeholder="No entries yet"
				disabled
			/>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
