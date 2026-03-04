import type { Meta, StoryObj } from "@storybook/react";
import { Eye, EyeOff, Mail, Search, X } from "lucide-react";
import { useState } from "react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
	title: "Primitives/Input",
	component: Input,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A text input component with support for icons, validation states, and multiple sizes.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
			description: "Size of the input",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		variant: {
			control: "select",
			options: ["default", "filled"],
			description: "Visual variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		isError: {
			control: "boolean",
			description: "Error state",
		},
		isFullWidth: {
			control: "boolean",
			description: "Full width",
		},
		disabled: {
			control: "boolean",
			description: "Disabled state",
		},
		placeholder: {
			control: "text",
			description: "Placeholder text",
		},
	},
	args: {
		placeholder: "Enter text...",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		placeholder: "Enter your name",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		placeholder: "Small input",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		placeholder: "Medium input",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		placeholder: "Large input",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Filled: Story = {
	args: {
		variant: "filled",
		placeholder: "Filled variant",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const WithError: Story = {
	args: {
		isError: true,
		placeholder: "Invalid input",
		defaultValue: "Invalid value",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: "Disabled input",
		defaultValue: "Cannot edit",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		leftElement: <Search size="1em" />,
		placeholder: "Search...",
	},
};

export const WithRightIcon: Story = {
	args: {
		rightElement: <Mail size="1em" />,
		placeholder: "Enter email",
		type: "email",
	},
};

export const WithBothIcons: Story = {
	args: {
		leftElement: <Search size="1em" />,
		rightElement: <X size="1em" />,
		placeholder: "Search with clear",
	},
};

// =============================================================================
// INPUT TYPES
// =============================================================================

export const EmailInput: Story = {
	args: {
		type: "email",
		leftElement: <Mail size="1em" />,
		placeholder: "you@example.com",
	},
};

export const SearchInput: Story = {
	args: {
		type: "search",
		leftElement: <Search size="1em" />,
		placeholder: "Search...",
	},
};

export const PasswordInput: Story = {
	render: () => {
		const [showPassword, setShowPassword] = useState(false);
		return (
			<Input
				type={showPassword ? "text" : "password"}
				placeholder="Enter password"
				rightElement={
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: 0,
							color: "inherit",
							display: "flex",
						}}
					>
						{showPassword ? <EyeOff size="1em" /> : <Eye size="1em" />}
					</button>
				}
			/>
		);
	},
};

// =============================================================================
// FULL WIDTH
// =============================================================================

export const FullWidth: Story = {
	args: {
		isFullWidth: true,
		placeholder: "Full width input",
	},
	decorators: [
		(Story) => (
			<div style={{ width: 400 }}>
				<Story />
			</div>
		),
	],
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllSizes: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
				width: 300,
			}}
		>
			<Input size="sm" placeholder="Small input" />
			<Input size="md" placeholder="Medium input" />
			<Input size="lg" placeholder="Large input" />
		</div>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
				width: 300,
			}}
		>
			<Input variant="default" placeholder="Default variant" />
			<Input variant="filled" placeholder="Filled variant" />
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
				width: 300,
			}}
		>
			<Input placeholder="Normal state" />
			<Input isError placeholder="Error state" />
			<Input disabled placeholder="Disabled state" />
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
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
						width: 280,
					}}
				>
					<Input size="sm" placeholder="Small" />
					<Input size="md" placeholder="Medium" />
					<Input size="lg" placeholder="Large" />
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
					With icons
				</p>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
						width: 280,
					}}
				>
					<Input leftElement={<Search size="1em" />} placeholder="Search..." />
					<Input
						leftElement={<Mail size="1em" />}
						placeholder="Email"
						type="email"
					/>
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
					States
				</p>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
						width: 280,
					}}
				>
					<Input placeholder="Default" />
					<Input isError placeholder="Error" defaultValue="Invalid" />
					<Input disabled placeholder="Disabled" />
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
