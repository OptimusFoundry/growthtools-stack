import type { Meta, StoryObj } from "@storybook/react-vite";
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
		label: "Work email",
		placeholder: "you@company.com",
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Workspace URL",
		placeholder: "acme",
		helperText: "This becomes acme.yourapp.com — you can change it later",
	},
};

export const Required: Story = {
	args: {
		label: "Legal company name",
		placeholder: "Acme Rocket Co.",
		required: true,
	},
};

export const WithError: Story = {
	args: {
		label: "Coupon code",
		placeholder: "Enter code",
		defaultValue: "LAUNCH50",
		errorMessage: "This code expired on July 31, 2026",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		label: "Billing email",
		placeholder: "billing@company.com",
		leftElement: <Mail size={16} />,
	},
};

export const WithRightIcon: Story = {
	args: {
		label: "Assignee",
		placeholder: "Search teammates...",
		rightElement: <User size={16} />,
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const FilledVariant: Story = {
	args: {
		label: "Support email",
		placeholder: "support@company.com",
		variant: "filled",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Discount code",
		placeholder: "SAVE20",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Project name",
		placeholder: "Q3 Marketing Site",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Organization name",
		placeholder: "Northwind Traders",
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Account ID",
		placeholder: "acct_9F2KQ7XLM",
		disabled: true,
	},
};

export const HiddenLabel: Story = {
	args: {
		label: "Search",
		placeholder: "Search invoices, customers, or plans",
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
			<TextField label="Full name" placeholder="Priya Natarajan" />
			<TextField
				label="Work email"
				placeholder="priya@northwindtraders.com"
				leftElement={<Mail size={16} />}
				helperText="We'll send your invoice receipts here"
			/>
			<TextField
				label="Workspace handle"
				placeholder="northwind"
				leftElement={<User size={16} />}
				errorMessage="northwind is already taken — try northwind-hq"
			/>
			<TextField
				label="Password"
				type="password"
				placeholder="••••••••"
				required
			/>
			<TextField label="Account ID" placeholder="acct_9F2KQ7XLM" disabled />
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
