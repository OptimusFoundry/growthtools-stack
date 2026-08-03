import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch";

const meta: Meta<typeof Switch> = {
	title: "Forms/Switch",
	component: Switch,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		labelPosition: {
			control: "select",
			options: ["left", "right"],
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
		label: "Dark mode",
	},
};

export const WithDescription: Story = {
	args: {
		label: "Weekly digest email",
		description: "A summary of activity across your workspace, sent Mondays",
	},
};

export const Checked: Story = {
	args: {
		label: "Two-factor authentication",
		defaultChecked: true,
	},
};

export const LabelLeft: Story = {
	args: {
		label: "Auto-renew subscription",
		labelPosition: "left",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Compact list view",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Show archived tickets",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Public workspace",
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "SSO enforcement (upgrade to Enterprise)",
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "Audit log retention (required on your plan)",
		disabled: true,
		defaultChecked: true,
	},
};

export const NoLabel: Story = {
	args: {
		"aria-label": "Mute channel notifications",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<Switch label="Dark mode" defaultChecked />
			<Switch
				label="Email notifications"
				description="Get notified when a teammate mentions you"
			/>
			<Switch
				label="Product updates"
				description="Occasional emails about new features"
			/>
			<Switch label="SSO enforcement (Enterprise only)" disabled />
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Switch label="Compact rows" size="sm" />
			<Switch label="Beta features" size="md" defaultChecked />
			<Switch label="Public profile" size="lg" />
		</div>
	),
};

export const SettingsExample: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				width: "320px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span>Dark mode</span>
				<Switch aria-label="Dark mode" defaultChecked />
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span>Desktop notifications</span>
				<Switch aria-label="Desktop notifications" />
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span>Auto-save drafts</span>
				<Switch aria-label="Auto-save drafts" defaultChecked />
			</div>
		</div>
	),
};
