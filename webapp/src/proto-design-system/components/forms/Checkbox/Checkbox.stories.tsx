import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
	title: "Forms/Checkbox",
	component: Checkbox,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
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
		label: "Accept terms and conditions",
	},
};

export const WithDescription: Story = {
	args: {
		label: "Email notifications",
		description: "Receive updates about your account via email",
	},
};

export const Checked: Story = {
	args: {
		label: "Remember me",
		defaultChecked: true,
	},
};

export const Indeterminate: Story = {
	args: {
		label: "Select all",
		indeterminate: true,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small checkbox",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Medium checkbox",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Large checkbox",
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Disabled option",
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "Disabled checked",
		disabled: true,
		defaultChecked: true,
	},
};

export const WithError: Story = {
	args: {
		label: "Required field",
		isError: true,
	},
};

export const NoLabel: Story = {
	args: {
		"aria-label": "Toggle option",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Checkbox label="Option 1" />
			<Checkbox label="Option 2" defaultChecked />
			<Checkbox label="Option 3" indeterminate />
			<Checkbox
				label="With description"
				description="This option has additional context"
			/>
			<Checkbox label="Disabled" disabled />
			<Checkbox label="Disabled checked" disabled defaultChecked />
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Checkbox label="Small" size="sm" />
			<Checkbox label="Medium" size="md" />
			<Checkbox label="Large" size="lg" />
		</div>
	),
};
