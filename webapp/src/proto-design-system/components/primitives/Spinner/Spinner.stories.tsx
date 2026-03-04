import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../Button";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
	title: "Primitives/Spinner",
	component: Spinner,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A loading spinner component with multiple sizes and color variants. Includes reduced motion support and screen reader accessibility.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl"],
			description: "Size of the spinner",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		variant: {
			control: "select",
			options: ["default", "primary", "secondary", "white"],
			description: "Color variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		label: {
			control: "text",
			description: "Accessible label for screen readers",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "Loading" },
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {};

// =============================================================================
// SIZES
// =============================================================================

export const ExtraSmall: Story = {
	args: {
		size: "xs",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
	},
};

export const White: Story = {
	args: {
		variant: "white",
	},
	parameters: {
		backgrounds: { default: "dark" },
	},
};

// =============================================================================
// WITH CONTENT
// =============================================================================

export const WithText: Story = {
	render: () => (
		<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
			<Spinner size="sm" />
			<span>Loading...</span>
		</div>
	),
};

export const InButton: Story = {
	render: () => (
		<Button variant="primary" disabled>
			<Spinner size="xs" variant="white" />
			<span>Submitting...</span>
		</Button>
	),
};

export const CenteredInContainer: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "200px",
				height: "150px",
				border: "1px dashed var(--color-border)",
				borderRadius: "var(--radius-md)",
			}}
		>
			<Spinner size="lg" variant="primary" />
		</div>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
			<Spinner size="xs" />
			<Spinner size="sm" />
			<Spinner size="md" />
			<Spinner size="lg" />
			<Spinner size="xl" />
		</div>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
			<Spinner variant="default" />
			<Spinner variant="primary" />
			<Spinner variant="secondary" />
			<div
				style={{
					background: "var(--color-base-content)",
					padding: "0.5rem",
					borderRadius: "var(--radius-sm)",
				}}
			>
				<Spinner variant="white" />
			</div>
		</div>
	),
};

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Sizes
				</p>
				<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
					<Spinner size="xs" />
					<Spinner size="sm" />
					<Spinner size="md" />
					<Spinner size="lg" />
					<Spinner size="xl" />
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Variants
				</p>
				<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
					<Spinner variant="default" />
					<Spinner variant="primary" />
					<Spinner variant="secondary" />
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Usage examples
				</p>
				<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<Spinner size="sm" />
						<span>Loading...</span>
					</div>
					<Button variant="primary" disabled>
						<Spinner size="xs" variant="white" />
						Saving
					</Button>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
