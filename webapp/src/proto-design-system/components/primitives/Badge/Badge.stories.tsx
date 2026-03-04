import type { Meta, StoryObj } from "@storybook/react";
import { Check, Clock, Star, X, Zap } from "lucide-react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
	title: "Primitives/Badge",
	component: Badge,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A badge component for displaying status, labels, counts, or tags. Supports multiple variants, sizes, and optional dot indicators.",
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
				"success",
				"warning",
				"error",
				"outline",
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
			description: "Size of the badge",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		rounded: {
			control: "boolean",
			description: "Makes the badge pill-shaped",
		},
		dot: {
			control: "boolean",
			description: "Shows a dot indicator",
		},
	},
	args: {
		children: "Badge",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		children: "Default",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		children: "Primary",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary",
	},
};

export const Success: Story = {
	args: {
		variant: "success",
		children: "Success",
	},
};

export const Warning: Story = {
	args: {
		variant: "warning",
		children: "Warning",
	},
};

export const ErrorBadge: Story = {
	args: {
		variant: "error",
		children: "Error",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline",
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
		children: "Large",
	},
};

// =============================================================================
// ROUNDED (PILL)
// =============================================================================

export const Rounded: Story = {
	args: {
		rounded: true,
		children: "Pill Badge",
	},
};

export const RoundedCount: Story = {
	args: {
		variant: "primary",
		rounded: true,
		children: "99+",
	},
};

// =============================================================================
// WITH DOT
// =============================================================================

export const WithDot: Story = {
	args: {
		dot: true,
		children: "Status",
	},
};

export const DotSuccess: Story = {
	args: {
		variant: "success",
		dot: true,
		children: "Online",
	},
};

export const DotError: Story = {
	args: {
		variant: "error",
		dot: true,
		children: "Offline",
	},
};

export const DotWarning: Story = {
	args: {
		variant: "warning",
		dot: true,
		children: "Away",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		leftIcon: <Star size="1em" />,
		children: "Featured",
	},
};

export const WithRightIcon: Story = {
	args: {
		rightIcon: <X size="1em" />,
		children: "Remove",
	},
};

export const IconSuccess: Story = {
	args: {
		variant: "success",
		leftIcon: <Check size="1em" />,
		children: "Verified",
	},
};

export const IconWarning: Story = {
	args: {
		variant: "warning",
		leftIcon: <Clock size="1em" />,
		children: "Pending",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllVariants: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				gap: "0.5rem",
				flexWrap: "wrap",
				alignItems: "center",
			}}
		>
			<Badge variant="default">Default</Badge>
			<Badge variant="primary">Primary</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="success">Success</Badge>
			<Badge variant="warning">Warning</Badge>
			<Badge variant="error">Error</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
			<Badge size="sm">Small</Badge>
			<Badge size="md">Medium</Badge>
			<Badge size="lg">Large</Badge>
		</div>
	),
};

export const StatusIndicators: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				gap: "0.5rem",
				flexWrap: "wrap",
				alignItems: "center",
			}}
		>
			<Badge variant="success" dot>
				Active
			</Badge>
			<Badge variant="warning" dot>
				Pending
			</Badge>
			<Badge variant="error" dot>
				Failed
			</Badge>
			<Badge variant="default" dot>
				Draft
			</Badge>
		</div>
	),
};

export const NotificationCounts: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Badge variant="primary" rounded>
				3
			</Badge>
			<Badge variant="error" rounded>
				12
			</Badge>
			<Badge variant="secondary" rounded>
				99+
			</Badge>
		</div>
	),
};

export const TagsWithIcons: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				gap: "0.5rem",
				flexWrap: "wrap",
				alignItems: "center",
			}}
		>
			<Badge variant="outline" leftIcon={<Star size="1em" />}>
				Featured
			</Badge>
			<Badge variant="success" leftIcon={<Check size="1em" />}>
				Verified
			</Badge>
			<Badge variant="warning" leftIcon={<Clock size="1em" />}>
				Pending
			</Badge>
			<Badge variant="primary" leftIcon={<Zap size="1em" />}>
				Pro
			</Badge>
		</div>
	),
};

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Variants
				</p>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<Badge variant="default">Default</Badge>
					<Badge variant="primary">Primary</Badge>
					<Badge variant="secondary">Secondary</Badge>
					<Badge variant="success">Success</Badge>
					<Badge variant="warning">Warning</Badge>
					<Badge variant="error">Error</Badge>
					<Badge variant="outline">Outline</Badge>
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Status indicators
				</p>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<Badge variant="success" dot>
						Online
					</Badge>
					<Badge variant="warning" dot>
						Away
					</Badge>
					<Badge variant="error" dot>
						Offline
					</Badge>
					<Badge variant="default" dot>
						Unknown
					</Badge>
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Pill badges
				</p>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<Badge variant="primary" rounded>
						New
					</Badge>
					<Badge variant="error" rounded>
						5
					</Badge>
					<Badge variant="success" rounded>
						99+
					</Badge>
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					With icons
				</p>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<Badge variant="outline" leftIcon={<Star size="1em" />}>
						Featured
					</Badge>
					<Badge variant="success" leftIcon={<Check size="1em" />}>
						Verified
					</Badge>
					<Badge variant="primary" leftIcon={<Zap size="1em" />}>
						Pro
					</Badge>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
