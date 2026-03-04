import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "./Divider";

const meta: Meta<typeof Divider> = {
	title: "Layout/Divider",
	component: Divider,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
		},
		variant: {
			control: "select",
			options: ["solid", "dashed", "dotted"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {};

export const Dashed: Story = {
	args: {
		variant: "dashed",
	},
};

export const Dotted: Story = {
	args: {
		variant: "dotted",
	},
};

// =============================================================================
// WITH LABEL
// =============================================================================

export const WithLabel: Story = {
	args: {
		children: "OR",
	},
};

export const WithLongLabel: Story = {
	args: {
		children: "Continue with",
	},
};

// =============================================================================
// VERTICAL
// =============================================================================

export const Vertical: Story = {
	args: {
		orientation: "vertical",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					height: "100px",
					alignItems: "center",
					gap: "1rem",
				}}
			>
				<span>Left</span>
				<Story />
				<span>Right</span>
			</div>
		),
	],
};

export const VerticalWithLabel: Story = {
	args: {
		orientation: "vertical",
		children: "OR",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					height: "150px",
					alignItems: "center",
					gap: "1rem",
				}}
			>
				<span>Left</span>
				<Story />
				<span>Right</span>
			</div>
		),
	],
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Solid
				</p>
				<Divider variant="solid" />
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Dashed
				</p>
				<Divider variant="dashed" />
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Dotted
				</p>
				<Divider variant="dotted" />
			</div>
		</div>
	),
};

export const InContent: Story = {
	render: () => (
		<div style={{ maxWidth: "400px" }}>
			<h3 style={{ margin: "0 0 0.5rem" }}>Section One</h3>
			<p style={{ margin: "0 0 1rem", color: "var(--color-muted)" }}>
				This is some content for the first section.
			</p>
			<Divider />
			<h3 style={{ margin: "1rem 0 0.5rem" }}>Section Two</h3>
			<p style={{ margin: 0, color: "var(--color-muted)" }}>
				This is some content for the second section.
			</p>
		</div>
	),
};

export const LoginDivider: Story = {
	render: () => (
		<div style={{ maxWidth: "300px" }}>
			<button
				type="button"
				style={{
					width: "100%",
					padding: "0.75rem",
					marginBottom: "1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				Continue with Google
			</button>
			<Divider>or continue with email</Divider>
			<input
				type="email"
				placeholder="Email"
				style={{
					width: "100%",
					padding: "0.75rem",
					marginTop: "1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					boxSizing: "border-box",
				}}
			/>
		</div>
	),
};
