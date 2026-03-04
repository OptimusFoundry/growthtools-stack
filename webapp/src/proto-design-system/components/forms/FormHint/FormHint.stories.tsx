import type { Meta, StoryObj } from "@storybook/react";
import { HelpCircle } from "lucide-react";
import { FormHint } from "./FormHint";

const meta: Meta<typeof FormHint> = {
	title: "Forms/FormHint",
	component: FormHint,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "error", "success"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof FormHint>;

export const Default: Story = {
	args: {
		children: "Enter your email address to receive updates.",
	},
};

export const WithIcon: Story = {
	args: {
		children: "Your password must be at least 8 characters.",
		showIcon: true,
	},
};

export const ErrorVariant: Story = {
	args: {
		children: "This field is required.",
		variant: "error",
		showIcon: true,
	},
};

export const Success: Story = {
	args: {
		children: "Username is available!",
		variant: "success",
		showIcon: true,
	},
};

export const CustomIcon: Story = {
	args: {
		children: "Need help? Contact support.",
		icon: <HelpCircle size={14} />,
	},
};

export const LongText: Story = {
	args: {
		children:
			"Your username will be visible to other users. Choose something memorable but appropriate. You can change it later in your account settings.",
		showIcon: true,
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: "300px" }}>
				<Story />
			</div>
		),
	],
};

export const AllVariants: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-4)",
				maxWidth: "300px",
			}}
		>
			<FormHint showIcon>Default hint text with helpful information.</FormHint>
			<FormHint variant="error" showIcon>
				Error message explaining what went wrong.
			</FormHint>
			<FormHint variant="success" showIcon>
				Success message confirming the action.
			</FormHint>
		</div>
	),
};

export const Hidden: Story = {
	args: {
		children: "This hint is hidden.",
		hidden: true,
	},
};
