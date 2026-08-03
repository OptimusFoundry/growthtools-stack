import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
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
		children: "Save changes",
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
		children: "View details",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		children: "Create workspace",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Preview invoice",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Dismiss",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Export CSV",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Delete workspace",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		children: "Copy link",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: "Invite teammate",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Start free trial",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Loading: Story = {
	args: {
		isLoading: true,
		children: "Uploading logo...",
	},
};

export const LoadingPrimary: Story = {
	args: {
		variant: "primary",
		isLoading: true,
		children: "Provisioning workspace...",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		children: "Requires admin role",
	},
};

export const DisabledPrimary: Story = {
	args: {
		variant: "primary",
		disabled: true,
		children: "Upgrade to continue",
	},
};

// =============================================================================
// FULL WIDTH
// =============================================================================

export const FullWidth: Story = {
	args: {
		isFullWidth: true,
		children: "Continue with email",
	},
	parameters: {
		layout: "padded",
	},
};

export const FullWidthPrimary: Story = {
	args: {
		variant: "primary",
		isFullWidth: true,
		children: "Complete purchase",
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
		children: "Add teammate",
	},
};

export const WithRightIcon: Story = {
	args: {
		rightIcon: <ArrowRight size="1em" />,
		children: "Next step",
	},
};

export const WithBothIcons: Story = {
	args: {
		leftIcon: <ArrowLeft size="1em" />,
		rightIcon: <ArrowRight size="1em" />,
		children: "Switch project",
	},
};

export const IconOnlyDefault: Story = {
	args: {
		isIconOnly: true,
		children: <Plus size="1em" />,
		"aria-label": "Add teammate",
	},
};

export const IconOnlyPrimary: Story = {
	args: {
		variant: "primary",
		isIconOnly: true,
		children: <Plus size="1em" />,
		"aria-label": "New project",
	},
};

export const IconOnlyDestructive: Story = {
	args: {
		variant: "destructive",
		isIconOnly: true,
		children: <Trash2 size="1em" />,
		"aria-label": "Delete API key",
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
				<Button variant="default">View details</Button>
				<Button variant="primary">Create workspace</Button>
				<Button variant="secondary">Preview invoice</Button>
				<Button variant="ghost">Dismiss</Button>
				<Button variant="outline">Export CSV</Button>
				<Button variant="destructive">Delete workspace</Button>
			</div>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button size="sm">Copy link</Button>
				<Button size="md">Invite teammate</Button>
				<Button size="lg">Start free trial</Button>
			</div>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button variant="primary" leftIcon={<Plus size="1em" />}>
					Add teammate
				</Button>
				<Button variant="primary" isLoading>
					Saving...
				</Button>
				<Button variant="primary" disabled>
					Upgrade to continue
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
				Copy link
			</Button>
			<Button variant="primary" size="md">
				Invite teammate
			</Button>
			<Button variant="primary" size="lg">
				Start free trial
			</Button>
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button variant="primary">Save changes</Button>
				<Button variant="primary" disabled>
					Requires admin role
				</Button>
				<Button variant="primary" isLoading>
					Saving...
				</Button>
			</div>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<Button variant="outline">Export CSV</Button>
				<Button variant="outline" disabled>
					No data to export
				</Button>
				<Button variant="outline" isLoading>
					Exporting...
				</Button>
			</div>
		</div>
	),
};

export const IconButtons: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Button variant="default" isIconOnly size="sm" aria-label="Add teammate">
				<Plus size="1em" />
			</Button>
			<Button variant="primary" isIconOnly size="md" aria-label="New project">
				<Plus size="1em" />
			</Button>
			<Button variant="outline" isIconOnly size="lg" aria-label="Add filter">
				<Plus size="1em" />
			</Button>
			<Button variant="destructive" isIconOnly aria-label="Delete API key">
				<Trash2 size="1em" />
			</Button>
		</div>
	),
};

export const Smoke: Story = {
	args: {
		children: "Save changes",
		onClick: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button", { name: /save changes/i });
		await expect(button).toBeVisible();
		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

// =============================================================================
// SHOWCASE — form action row
// =============================================================================

export const FormActionRow: Story = {
	render: () => (
		<div
			style={{
				width: 360,
				padding: "1.5rem",
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-lg)",
			}}
		>
			<p style={{ marginBottom: "1rem", fontWeight: 600 }}>
				Cancel this subscription?
			</p>
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					gap: "0.75rem",
				}}
			>
				<Button variant="ghost">Keep subscription</Button>
				<Button variant="destructive">Cancel subscription</Button>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
