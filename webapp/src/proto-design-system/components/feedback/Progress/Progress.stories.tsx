import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./Progress";

const meta: Meta<typeof Progress> = {
	title: "Feedback/Progress",
	component: Progress,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "success", "warning", "error"],
		},
		value: {
			control: { type: "range", min: 0, max: 100 },
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "300px" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		value: 60,
	},
};

export const WithLabel: Story = {
	args: {
		value: 75,
		showLabel: true,
	},
};

export const Complete: Story = {
	args: {
		value: 100,
		showLabel: true,
	},
};

export const Empty: Story = {
	args: {
		value: 0,
		showLabel: true,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		value: 60,
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		value: 60,
		size: "md",
	},
};

export const Large: Story = {
	args: {
		value: 60,
		size: "lg",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Success: Story = {
	args: {
		value: 100,
		variant: "success",
		showLabel: true,
	},
};

export const Warning: Story = {
	args: {
		value: 80,
		variant: "warning",
		showLabel: true,
	},
};

export const ErrorVariant: Story = {
	args: {
		value: 25,
		variant: "error",
		showLabel: true,
	},
};

// =============================================================================
// INDETERMINATE
// =============================================================================

export const Indeterminate: Story = {
	args: {
		value: 0,
		indeterminate: true,
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						color: "var(--color-muted)",
						fontSize: "0.875rem",
					}}
				>
					Small
				</p>
				<Progress value={60} size="sm" />
			</div>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						color: "var(--color-muted)",
						fontSize: "0.875rem",
					}}
				>
					Medium
				</p>
				<Progress value={60} size="md" />
			</div>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						color: "var(--color-muted)",
						fontSize: "0.875rem",
					}}
				>
					Large
				</p>
				<Progress value={60} size="lg" />
			</div>
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Progress value={25} variant="default" showLabel />
			<Progress value={50} variant="success" showLabel />
			<Progress value={75} variant="warning" showLabel />
			<Progress value={90} variant="error" showLabel />
		</div>
	),
};

export const FileUpload: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.875rem" }}>document.pdf</span>
					<span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
						2.4 MB
					</span>
				</div>
				<Progress value={100} variant="success" />
			</div>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.875rem" }}>image.png</span>
					<span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
						1.2 MB
					</span>
				</div>
				<Progress value={65} showLabel />
			</div>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.875rem" }}>video.mp4</span>
					<span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
						48.5 MB
					</span>
				</div>
				<Progress value={0} indeterminate />
			</div>
		</div>
	),
};
