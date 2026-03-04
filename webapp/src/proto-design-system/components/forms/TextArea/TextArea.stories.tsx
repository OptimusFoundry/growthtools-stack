import type { Meta, StoryObj } from "@storybook/react";
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
		label: "Description",
		placeholder: "Enter a description...",
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Bio",
		placeholder: "Tell us about yourself",
		helperText: "Max 500 characters",
	},
};

export const Required: Story = {
	args: {
		label: "Message",
		placeholder: "Enter your message",
		required: true,
	},
};

export const WithError: Story = {
	args: {
		label: "Description",
		placeholder: "Enter a description",
		defaultValue: "Too short",
		errorMessage: "Description must be at least 50 characters",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small",
		placeholder: "Small textarea",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Medium",
		placeholder: "Medium textarea",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Large",
		placeholder: "Large textarea",
		size: "lg",
	},
};

// =============================================================================
// RESIZE OPTIONS
// =============================================================================

export const NoResize: Story = {
	args: {
		label: "No resize",
		placeholder: "Cannot be resized",
		resize: "none",
	},
};

export const ResizeVertical: Story = {
	args: {
		label: "Vertical resize",
		placeholder: "Can resize vertically",
		resize: "vertical",
	},
};

export const ResizeBoth: Story = {
	args: {
		label: "Both directions",
		placeholder: "Can resize both ways",
		resize: "both",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Disabled",
		placeholder: "Cannot edit",
		disabled: true,
	},
};

export const CustomRows: Story = {
	args: {
		label: "Large text area",
		placeholder: "Enter detailed description...",
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
				label="Bio"
				placeholder="Tell us about yourself"
				helperText="Max 500 characters"
			/>
			<TextArea
				label="Feedback"
				placeholder="Share your thoughts..."
				required
				rows={5}
			/>
			<TextArea
				label="Error state"
				defaultValue="Invalid"
				errorMessage="Please provide more detail"
			/>
			<TextArea label="Disabled" placeholder="Cannot edit" disabled />
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
