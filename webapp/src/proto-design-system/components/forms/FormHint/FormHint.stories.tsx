import type { Meta, StoryObj } from "@storybook/react-vite";
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
		children: "We'll only use this to send booking confirmations.",
	},
};

export const WithIcon: Story = {
	args: {
		children: "API keys are scoped to this workspace only.",
		showIcon: true,
	},
};

export const ErrorVariant: Story = {
	args: {
		children: "Card number is invalid.",
		variant: "error",
		showIcon: true,
	},
};

export const Success: Story = {
	args: {
		children: "Domain verified — DNS records look good.",
		variant: "success",
		showIcon: true,
	},
};

export const CustomIcon: Story = {
	args: {
		children: "Not sure which plan fits? Talk to sales.",
		icon: <HelpCircle size={14} />,
	},
};

export const LongText: Story = {
	args: {
		children:
			"Your webhook endpoint must respond with a 2xx status within 5 seconds or the delivery will be retried up to 3 times with exponential backoff.",
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
			<FormHint showIcon>Changes are saved automatically as you type.</FormHint>
			<FormHint variant="error" showIcon>
				This subdomain is already taken by another workspace.
			</FormHint>
			<FormHint variant="success" showIcon>
				Two-factor authentication is enabled.
			</FormHint>
		</div>
	),
};

export const Hidden: Story = {
	args: {
		children: "This hint is hidden until the field gains focus.",
		hidden: true,
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
				gap: "var(--space-5)",
				maxWidth: "320px",
			}}
		>
			<div>
				<div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
					Webhook signing secret
				</div>
				<FormHint showIcon>
					Used to verify that events came from us. Rotate it if it's ever
					exposed.
				</FormHint>
			</div>
			<div>
				<div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
					Subdomain
				</div>
				<FormHint variant="error" showIcon>
					northwind is already in use — try northwind-team.
				</FormHint>
			</div>
			<div>
				<div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
					Payout account
				</div>
				<FormHint variant="success" showIcon>
					Bank account ending in 4821 is verified and ready for payouts.
				</FormHint>
			</div>
		</div>
	),
};
