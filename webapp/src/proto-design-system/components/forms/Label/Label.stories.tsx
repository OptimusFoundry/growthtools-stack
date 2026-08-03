import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@/proto-design-system/components/primitives/Badge/Badge";
import { Label } from "./Label";

const meta: Meta<typeof Label> = {
	title: "Forms/Label",
	component: Label,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
	args: {
		children: "Work email",
		htmlFor: "work-email",
	},
};

export const Required: Story = {
	args: {
		children: "Company legal name",
		htmlFor: "company-name",
		required: true,
	},
};

export const WithSubText: Story = {
	args: {
		children: "Backup phone number",
		subText: "optional",
		htmlFor: "backup-phone",
	},
};

export const WithBadge: Story = {
	args: {
		children: "API key name",
		htmlFor: "api-key-name",
		badge: <Badge size="sm">New</Badge>,
	},
};

export const WithAction: Story = {
	args: {
		children: "Account password",
		htmlFor: "account-password",
		required: true,
		action: (
			<a
				href="#"
				style={{
					color: "var(--color-primary)",
					fontSize: "var(--font-size-xs)",
					textDecoration: "none",
				}}
			>
				Forgot password?
			</a>
		),
	},
};

export const FullFeatured: Story = {
	args: {
		children: "Webhook signing secret",
		subText: "regenerate anytime",
		htmlFor: "webhook-secret",
		badge: (
			<Badge size="sm" variant="primary">
				Beta
			</Badge>
		),
		action: (
			<a
				href="#"
				style={{
					color: "var(--color-primary)",
					fontSize: "var(--font-size-xs)",
					textDecoration: "none",
				}}
			>
				View docs
			</a>
		),
	},
};

export const Sizes: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-4)",
			}}
		>
			<Label size="sm">Coupon code</Label>
			<Label size="md">Billing address</Label>
			<Label size="lg">Organization name</Label>
		</div>
	),
};

export const Disabled: Story = {
	args: {
		children: "Custom domain (upgrade to Pro to enable)",
		disabled: true,
	},
};
