import type { Meta, StoryObj } from "@storybook/react-vite";
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
		label: "I agree to the Terms of Service and Privacy Policy",
	},
};

export const WithDescription: Story = {
	args: {
		label: "Weekly digest",
		description: "A summary of your team's activity, sent every Monday",
	},
};

export const Checked: Story = {
	args: {
		label: "Keep me signed in on this device",
		defaultChecked: true,
	},
};

export const Indeterminate: Story = {
	args: {
		label: "Select all invoices",
		indeterminate: true,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Show line numbers",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Enable syntax highlighting",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Enable dark mode",
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Two-factor authentication (requires verified phone)",
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "SSO enforced by your organization",
		disabled: true,
		defaultChecked: true,
	},
};

export const WithError: Story = {
	args: {
		label: "I confirm I have permission to invite these teammates",
		isError: true,
	},
};

export const NoLabel: Story = {
	args: {
		"aria-label": "Select invoice INV-2024-0093",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Checkbox label="Product updates and new features" defaultChecked />
			<Checkbox label="Billing and invoice receipts" defaultChecked />
			<Checkbox
				label="Marketing emails"
				description="Occasional tips, case studies, and promotions"
			/>
			<Checkbox label="Select all channels" indeterminate />
			<Checkbox label="SMS alerts (requires verified phone number)" disabled />
			<Checkbox
				label="Security alerts"
				description="Cannot be disabled for admin accounts"
				disabled
				defaultChecked
			/>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Checkbox label="Compact table rows" size="sm" />
			<Checkbox label="Comfortable table rows" size="md" />
			<Checkbox label="Spacious table rows" size="lg" />
		</div>
	),
};
