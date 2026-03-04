import type { Meta, StoryObj } from "@storybook/react";
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
		label: "Notifications",
		description: "Receive push notifications on your device",
	},
};

export const Checked: Story = {
	args: {
		label: "Enabled",
		defaultChecked: true,
	},
};

export const LabelLeft: Story = {
	args: {
		label: "Dark mode",
		labelPosition: "left",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small switch",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Medium switch",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Large switch",
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Disabled",
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "Disabled on",
		disabled: true,
		defaultChecked: true,
	},
};

export const NoLabel: Story = {
	args: {
		"aria-label": "Toggle feature",
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
				description="Receive updates via email"
			/>
			<Switch label="Marketing emails" description="Get promotional content" />
			<Switch label="Disabled option" disabled />
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Switch label="Small" size="sm" />
			<Switch label="Medium" size="md" defaultChecked />
			<Switch label="Large" size="lg" />
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
				width: "300px",
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
				<span>Notifications</span>
				<Switch aria-label="Notifications" />
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span>Auto-save</span>
				<Switch aria-label="Auto-save" defaultChecked />
			</div>
		</div>
	),
};
