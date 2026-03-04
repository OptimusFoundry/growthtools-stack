import type { Meta, StoryObj } from "@storybook/react";
import { Mail, User } from "lucide-react";
import { TextField } from "./TextField";

const meta: Meta<typeof TextField> = {
	title: "Forms/TextField",
	component: TextField,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "filled"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		label: "Email",
		placeholder: "Enter your email",
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Username",
		placeholder: "Enter username",
		helperText: "Choose a unique username",
	},
};

export const Required: Story = {
	args: {
		label: "Email",
		placeholder: "Enter your email",
		required: true,
	},
};

export const WithError: Story = {
	args: {
		label: "Username",
		placeholder: "Enter username",
		defaultValue: "john",
		errorMessage: "This username is already taken",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		label: "Email",
		placeholder: "Enter your email",
		leftElement: <Mail size={16} />,
	},
};

export const WithRightIcon: Story = {
	args: {
		label: "Username",
		placeholder: "Enter username",
		rightElement: <User size={16} />,
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const FilledVariant: Story = {
	args: {
		label: "Email",
		placeholder: "Enter your email",
		variant: "filled",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small input",
		placeholder: "Small",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Medium input",
		placeholder: "Medium",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Large input",
		placeholder: "Large",
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Disabled field",
		placeholder: "Cannot edit",
		disabled: true,
	},
};

export const HiddenLabel: Story = {
	args: {
		label: "Search",
		placeholder: "Search...",
		hideLabel: true,
		"aria-label": "Search",
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
				width: "300px",
			}}
		>
			<TextField label="Full name" placeholder="John Doe" />
			<TextField
				label="Email"
				placeholder="john@example.com"
				leftElement={<Mail size={16} />}
				helperText="We'll never share your email"
			/>
			<TextField
				label="Username"
				placeholder="johndoe"
				leftElement={<User size={16} />}
				errorMessage="Username is already taken"
			/>
			<TextField
				label="Password"
				type="password"
				placeholder="••••••••"
				required
			/>
			<TextField label="Disabled" placeholder="Cannot edit" disabled />
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
