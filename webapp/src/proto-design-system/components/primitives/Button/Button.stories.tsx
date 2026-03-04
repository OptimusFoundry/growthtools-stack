import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
	title: "Primitives/Button",
	component: Button,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A versatile button component with multiple variants, sizes, and states. Supports icons, loading state, and full accessibility.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"primary",
				"secondary",
				"ghost",
				"outline",
				"destructive",
			],
			description: "Visual style variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
			description: "Size of the button",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		isLoading: {
			control: "boolean",
			description: "Shows loading spinner and disables interaction",
		},
		isFullWidth: {
			control: "boolean",
			description: "Makes button take full width of container",
		},
		isIconOnly: {
			control: "boolean",
			description: "Renders button as icon-only (square aspect ratio)",
		},
		disabled: {
			control: "boolean",
			description: "Disables the button",
		},
		children: {
			control: "text",
			description: "Button content",
		},
	},
	args: {
		onClick: fn(),
		children: "Button",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT STATES
// =============================================================================

export const Default: Story = {
	args: {
		variant: "default",
		children: "Default Button",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		children: "Primary Button",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary Button",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Ghost Button",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline Button",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Delete",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: "Medium",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large Button",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Loading: Story = {
	args: {
		isLoading: true,
		children: "Loading...",
	},
};

export const LoadingPrimary: Story = {
	args: {
		variant: "primary",
		isLoading: true,
		children: "Submitting...",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		children: "Disabled",
	},
};

export const DisabledPrimary: Story = {
	args: {
		variant: "primary",
		disabled: true,
		children: "Disabled Primary",
	},
};

// =============================================================================
// FULL WIDTH
// =============================================================================

export const FullWidth: Story = {
	args: {
		isFullWidth: true,
		children: "Full Width Button",
	},
	parameters: {
		layout: "padded",
	},
};

export const FullWidthPrimary: Story = {
	args: {
		variant: "primary",
		isFullWidth: true,
		children: "Full Width Primary",
	},
	parameters: {
		layout: "padded",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		leftIcon: <Plus size="1em" />,
		children: "Add Item",
	},
};

export const WithRightIcon: Story = {
	args: {
		rightIcon: <ArrowRight size="1em" />,
		children: "Next",
	},
};

export const WithBothIcons: Story = {
	args: {
		leftIcon: <ArrowLeft size="1em" />,
		rightIcon: <ArrowRight size="1em" />,
		children: "Navigate",
	},
};

export const IconOnlyDefault: Story = {
	args: {
		isIconOnly: true,
		children: <Plus size="1em" />,
		"aria-label": "Add item",
	},
};

export const IconOnlyPrimary: Story = {
	args: {
		variant: "primary",
		isIconOnly: true,
		children: <Plus size="1em" />,
		"aria-label": "Add item",
	},
};

export const IconOnlyDestructive: Story = {
	args: {
		variant: "destructive",
		isIconOnly: true,
		children: <Trash2 size="1em" />,
		"aria-label": "Delete item",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<div
				style={{
					display: "flex",
					gap: "0.75rem",
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				<Button variant="default">Default</Button>
				<Button variant="primary">Primary</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="destructive">Destructive</Button>
			</div>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button size="sm">Small</Button>
				<Button size="md">Medium</Button>
				<Button size="lg">Large</Button>
			</div>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button variant="primary" leftIcon={<Plus size="1em" />}>
					With Icon
				</Button>
				<Button variant="primary" isLoading>
					Loading
				</Button>
				<Button variant="primary" disabled>
					Disabled
				</Button>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Button variant="primary" size="sm">
				Small
			</Button>
			<Button variant="primary" size="md">
				Medium
			</Button>
			<Button variant="primary" size="lg">
				Large
			</Button>
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button variant="primary">Normal</Button>
				<Button variant="primary" disabled>
					Disabled
				</Button>
				<Button variant="primary" isLoading>
					Loading
				</Button>
			</div>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button variant="outline">Normal</Button>
				<Button variant="outline" disabled>
					Disabled
				</Button>
				<Button variant="outline" isLoading>
					Loading
				</Button>
			</div>
		</div>
	),
};

export const IconButtons: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Button variant="default" isIconOnly size="sm" aria-label="Add">
				<Plus size="1em" />
			</Button>
			<Button variant="primary" isIconOnly size="md" aria-label="Add">
				<Plus size="1em" />
			</Button>
			<Button variant="outline" isIconOnly size="lg" aria-label="Add">
				<Plus size="1em" />
			</Button>
			<Button variant="destructive" isIconOnly aria-label="Delete">
				<Trash2 size="1em" />
			</Button>
		</div>
	),
};
