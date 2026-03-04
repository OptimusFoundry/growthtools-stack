import type { Meta, StoryObj } from "@storybook/react";
import { Radio } from "./Radio";

const meta: Meta<typeof Radio> = {
	title: "Forms/Radio",
	component: Radio,
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
		label: "Option 1",
		name: "default-radio",
	},
};

export const WithDescription: Story = {
	args: {
		label: "Pro plan",
		description: "$9/month - Unlimited features",
		name: "plan",
	},
};

export const Checked: Story = {
	args: {
		label: "Selected option",
		name: "checked-radio",
		defaultChecked: true,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small radio",
		size: "sm",
		name: "size-sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Medium radio",
		size: "md",
		name: "size-md",
	},
};

export const Large: Story = {
	args: {
		label: "Large radio",
		size: "lg",
		name: "size-lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Disabled option",
		disabled: true,
		name: "disabled",
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "Disabled selected",
		disabled: true,
		defaultChecked: true,
		name: "disabled-checked",
	},
};

export const WithError: Story = {
	args: {
		label: "Required field",
		isError: true,
		name: "error",
	},
};

// =============================================================================
// GROUP
// =============================================================================

export const RadioGroup: Story = {
	render: () => (
		<fieldset style={{ border: "none", padding: 0, margin: 0 }}>
			<legend style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
				Select a plan
			</legend>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<Radio
					name="plan"
					value="free"
					label="Free"
					description="Basic features"
				/>
				<Radio
					name="plan"
					value="pro"
					label="Pro"
					description="$9/month"
					defaultChecked
				/>
				<Radio
					name="plan"
					value="enterprise"
					label="Enterprise"
					description="Custom pricing"
				/>
			</div>
		</fieldset>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Radio name="sizes" value="sm" label="Small" size="sm" />
			<Radio name="sizes" value="md" label="Medium" size="md" defaultChecked />
			<Radio name="sizes" value="lg" label="Large" size="lg" />
		</div>
	),
};
