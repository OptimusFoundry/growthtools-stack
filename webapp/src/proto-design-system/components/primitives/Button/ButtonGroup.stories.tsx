import type { Meta, StoryObj } from "@storybook/react";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	ChevronLeft,
	ChevronRight,
	Italic,
	Underline,
} from "lucide-react";
import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";

const meta: Meta<typeof ButtonGroup> = {
	title: "Primitives/ButtonGroup",
	component: ButtonGroup,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Groups multiple buttons together with consistent spacing. Supports attached mode for connected buttons.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
			description: "Direction of the button group",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "horizontal" },
			},
		},
		spacing: {
			control: "select",
			options: ["sm", "md", "lg"],
			description: "Spacing between buttons",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "sm" },
			},
		},
		isAttached: {
			control: "boolean",
			description: "Whether buttons should be visually connected",
		},
		isFullWidth: {
			control: "boolean",
			description: "Whether the group should take full width",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<Button>Left</Button>
			<Button>Center</Button>
			<Button>Right</Button>
		</ButtonGroup>
	),
};

// =============================================================================
// ATTACHED
// =============================================================================

export const Attached: Story = {
	render: () => (
		<ButtonGroup isAttached>
			<Button variant="outline">Left</Button>
			<Button variant="outline">Center</Button>
			<Button variant="outline">Right</Button>
		</ButtonGroup>
	),
};

export const AttachedPrimary: Story = {
	render: () => (
		<ButtonGroup isAttached>
			<Button variant="primary">Save</Button>
			<Button variant="primary" isIconOnly aria-label="More options">
				<ChevronRight size="1em" />
			</Button>
		</ButtonGroup>
	),
};

// =============================================================================
// TOOLBAR EXAMPLES
// =============================================================================

export const TextFormatting: Story = {
	render: () => (
		<ButtonGroup isAttached>
			<Button variant="outline" isIconOnly aria-label="Bold">
				<Bold size="1em" />
			</Button>
			<Button variant="outline" isIconOnly aria-label="Italic">
				<Italic size="1em" />
			</Button>
			<Button variant="outline" isIconOnly aria-label="Underline">
				<Underline size="1em" />
			</Button>
		</ButtonGroup>
	),
};

export const TextAlignment: Story = {
	render: () => (
		<ButtonGroup isAttached>
			<Button variant="outline" isIconOnly aria-label="Align left">
				<AlignLeft size="1em" />
			</Button>
			<Button variant="outline" isIconOnly aria-label="Align center">
				<AlignCenter size="1em" />
			</Button>
			<Button variant="outline" isIconOnly aria-label="Align right">
				<AlignRight size="1em" />
			</Button>
		</ButtonGroup>
	),
};

// =============================================================================
// PAGINATION
// =============================================================================

export const Pagination: Story = {
	render: () => (
		<ButtonGroup isAttached>
			<Button variant="outline" isIconOnly aria-label="Previous page">
				<ChevronLeft size="1em" />
			</Button>
			<Button variant="outline">1</Button>
			<Button variant="primary">2</Button>
			<Button variant="outline">3</Button>
			<Button variant="outline">4</Button>
			<Button variant="outline" isIconOnly aria-label="Next page">
				<ChevronRight size="1em" />
			</Button>
		</ButtonGroup>
	),
};

// =============================================================================
// VERTICAL
// =============================================================================

export const Vertical: Story = {
	render: () => (
		<ButtonGroup orientation="vertical">
			<Button>Top</Button>
			<Button>Middle</Button>
			<Button>Bottom</Button>
		</ButtonGroup>
	),
};

export const VerticalAttached: Story = {
	render: () => (
		<ButtonGroup orientation="vertical" isAttached>
			<Button variant="outline">Top</Button>
			<Button variant="outline">Middle</Button>
			<Button variant="outline">Bottom</Button>
		</ButtonGroup>
	),
};

// =============================================================================
// SPACING
// =============================================================================

export const SpacingSmall: Story = {
	render: () => (
		<ButtonGroup spacing="sm">
			<Button>One</Button>
			<Button>Two</Button>
			<Button>Three</Button>
		</ButtonGroup>
	),
};

export const SpacingMedium: Story = {
	render: () => (
		<ButtonGroup spacing="md">
			<Button>One</Button>
			<Button>Two</Button>
			<Button>Three</Button>
		</ButtonGroup>
	),
};

export const SpacingLarge: Story = {
	render: () => (
		<ButtonGroup spacing="lg">
			<Button>One</Button>
			<Button>Two</Button>
			<Button>Three</Button>
		</ButtonGroup>
	),
};

// =============================================================================
// FULL WIDTH
// =============================================================================

export const FullWidth: Story = {
	render: () => (
		<div style={{ width: "400px" }}>
			<ButtonGroup isFullWidth>
				<Button variant="outline">Cancel</Button>
				<Button variant="primary">Confirm</Button>
			</ButtonGroup>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};

export const FullWidthAttached: Story = {
	render: () => (
		<div style={{ width: "400px" }}>
			<ButtonGroup isFullWidth isAttached>
				<Button variant="outline">Monthly</Button>
				<Button variant="primary">Yearly</Button>
			</ButtonGroup>
		</div>
	),
	parameters: {
		layout: "padded",
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
				alignItems: "flex-start",
			}}
		>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Spaced buttons
				</p>
				<ButtonGroup>
					<Button>Cancel</Button>
					<Button variant="primary">Save</Button>
				</ButtonGroup>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Attached buttons
				</p>
				<ButtonGroup isAttached>
					<Button variant="outline">Left</Button>
					<Button variant="outline">Center</Button>
					<Button variant="outline">Right</Button>
				</ButtonGroup>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Icon toolbar
				</p>
				<ButtonGroup isAttached>
					<Button variant="outline" isIconOnly aria-label="Bold">
						<Bold size="1em" />
					</Button>
					<Button variant="outline" isIconOnly aria-label="Italic">
						<Italic size="1em" />
					</Button>
					<Button variant="outline" isIconOnly aria-label="Underline">
						<Underline size="1em" />
					</Button>
				</ButtonGroup>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Vertical group
				</p>
				<ButtonGroup orientation="vertical" isAttached>
					<Button variant="outline" size="sm">
						Option A
					</Button>
					<Button variant="outline" size="sm">
						Option B
					</Button>
					<Button variant="outline" size="sm">
						Option C
					</Button>
				</ButtonGroup>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
