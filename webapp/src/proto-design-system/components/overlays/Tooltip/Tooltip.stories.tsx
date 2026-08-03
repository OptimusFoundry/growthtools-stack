import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bold, Copy, HelpCircle, Info, Italic, Underline } from "lucide-react";
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

const iconButtonStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: "36px",
	height: "36px",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-md)",
	background: "var(--color-surface)",
	cursor: "pointer",
};

// =============================================================================
// POSITIONS
// =============================================================================

export const Top: Story = {
	args: {
		content: "Bold (Cmd+B)",
		position: "top",
		children: (
			<button type="button" style={iconButtonStyle} aria-label="Bold">
				<Bold size={16} />
			</button>
		),
	},
};

export const Bottom: Story = {
	args: {
		content: "Italic (Cmd+I)",
		position: "bottom",
		children: (
			<button type="button" style={iconButtonStyle} aria-label="Italic">
				<Italic size={16} />
			</button>
		),
	},
};

export const Left: Story = {
	args: {
		content: "Underline (Cmd+U)",
		position: "left",
		children: (
			<button type="button" style={iconButtonStyle} aria-label="Underline">
				<Underline size={16} />
			</button>
		),
	},
};

export const Right: Story = {
	args: {
		content: "Copy to clipboard",
		position: "right",
		children: (
			<button type="button" style={iconButtonStyle} aria-label="Copy">
				<Copy size={16} />
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
			"Monthly recurring revenue, net of refunds and failed payments, calculated as of the first day of the current billing cycle.",
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
				MRR: $48,200
			</button>
		),
	},
};

export const NoDelay: Story = {
	args: {
		content: "Copy invite link",
		children: (
			<button
				type="button"
				style={iconButtonStyle}
				aria-label="Copy invite link"
			>
				<Copy size={16} />
			</button>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const FormattingToolbar: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				gap: "0.25rem",
				padding: "0.5rem",
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-md)",
				background: "var(--color-surface)",
			}}
		>
			<Tooltip content="Bold (Cmd+B)" position="top">
				<button type="button" style={iconButtonStyle} aria-label="Bold">
					<Bold size={16} />
				</button>
			</Tooltip>
			<Tooltip content="Italic (Cmd+I)" position="top">
				<button type="button" style={iconButtonStyle} aria-label="Italic">
					<Italic size={16} />
				</button>
			</Tooltip>
			<Tooltip content="Underline (Cmd+U)" position="top">
				<button type="button" style={iconButtonStyle} aria-label="Underline">
					<Underline size={16} />
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
