import type { Meta, StoryObj } from "@storybook/react";
import { HelpCircle, Info } from "lucide-react";
import { Tooltip } from "./Tooltip";

const meta: Meta<typeof Tooltip> = {
	title: "Feedback/Tooltip",
	component: Tooltip,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		position: {
			control: "select",
			options: ["top", "bottom", "left", "right"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// POSITIONS
// =============================================================================

export const Top: Story = {
	args: {
		content: "Tooltip on top",
		position: "top",
		children: (
			<button
				type="button"
				style={{
					padding: "0.5rem 1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				Hover me
			</button>
		),
	},
};

export const Bottom: Story = {
	args: {
		content: "Tooltip on bottom",
		position: "bottom",
		children: (
			<button
				type="button"
				style={{
					padding: "0.5rem 1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				Hover me
			</button>
		),
	},
};

export const Left: Story = {
	args: {
		content: "Tooltip on left",
		position: "left",
		children: (
			<button
				type="button"
				style={{
					padding: "0.5rem 1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				Hover me
			</button>
		),
	},
};

export const Right: Story = {
	args: {
		content: "Tooltip on right",
		position: "right",
		children: (
			<button
				type="button"
				style={{
					padding: "0.5rem 1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				Hover me
			</button>
		),
	},
};

// =============================================================================
// OPTIONS
// =============================================================================

export const LongContent: Story = {
	args: {
		content:
			"This is a longer tooltip message that demonstrates how the tooltip handles multi-line content.",
		children: (
			<button
				type="button"
				style={{
					padding: "0.5rem 1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				Hover for more info
			</button>
		),
	},
};

export const NoDelay: Story = {
	args: {
		content: "Instant tooltip",
		delay: 0,
		children: (
			<button
				type="button"
				style={{
					padding: "0.5rem 1rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					background: "var(--color-surface)",
					cursor: "pointer",
				}}
			>
				No delay
			</button>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllPositions: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "2rem", padding: "4rem" }}>
			<Tooltip content="Top" position="top">
				<button
					type="button"
					style={{
						padding: "0.5rem 1rem",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						background: "var(--color-surface)",
						cursor: "pointer",
					}}
				>
					Top
				</button>
			</Tooltip>
			<Tooltip content="Bottom" position="bottom">
				<button
					type="button"
					style={{
						padding: "0.5rem 1rem",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						background: "var(--color-surface)",
						cursor: "pointer",
					}}
				>
					Bottom
				</button>
			</Tooltip>
			<Tooltip content="Left" position="left">
				<button
					type="button"
					style={{
						padding: "0.5rem 1rem",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						background: "var(--color-surface)",
						cursor: "pointer",
					}}
				>
					Left
				</button>
			</Tooltip>
			<Tooltip content="Right" position="right">
				<button
					type="button"
					style={{
						padding: "0.5rem 1rem",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						background: "var(--color-surface)",
						cursor: "pointer",
					}}
				>
					Right
				</button>
			</Tooltip>
		</div>
	),
};

export const WithIcons: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
			<Tooltip content="Get help with this feature">
				<button
					type="button"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						padding: "0.5rem 1rem",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						background: "var(--color-surface)",
						cursor: "pointer",
					}}
				>
					<HelpCircle size={16} />
					Help
				</button>
			</Tooltip>
			<Tooltip content="Click for more information about this setting">
				<span style={{ color: "var(--color-muted)", cursor: "help" }}>
					<Info size={18} />
				</span>
			</Tooltip>
		</div>
	),
};
