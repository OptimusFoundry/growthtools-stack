import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../../primitives/Badge";
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
		children: "Email address",
		htmlFor: "email",
	},
};

export const Required: Story = {
	args: {
		children: "Email address",
		htmlFor: "email",
		required: true,
	},
};

export const WithSubText: Story = {
	args: {
		children: "Phone number",
		subText: "optional",
		htmlFor: "phone",
	},
};

export const WithBadge: Story = {
	args: {
		children: "Username",
		htmlFor: "username",
		badge: <Badge size="sm">New</Badge>,
	},
};

export const WithAction: Story = {
	args: {
		children: "Password",
		htmlFor: "password",
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
		children: "Display name",
		subText: "optional",
		htmlFor: "display-name",
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
				Learn more
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
			<Label size="sm">Small label</Label>
			<Label size="md">Medium label (default)</Label>
			<Label size="lg">Large label</Label>
		</div>
	),
};

export const Disabled: Story = {
	args: {
		children: "Disabled label",
		disabled: true,
	},
};
