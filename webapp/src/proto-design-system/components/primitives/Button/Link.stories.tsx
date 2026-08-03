import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "./Link";

const meta: Meta<typeof Link> = {
	title: "Primitives/Link",
	component: Link,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A styled hyperlink component for inline or standalone text links. Use for navigation within text or as standalone links.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "muted", "primary"],
			description: "Visual style variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
			description: "Size of the link",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		underlineOnHover: {
			control: "boolean",
			description: "Show underline only on hover",
		},
		href: {
			control: "text",
			description: "URL to navigate to",
		},
		target: {
			control: "select",
			options: ["_self", "_blank", "_parent", "_top"],
			description: "Where to open the link",
		},
	},
	args: {
		href: "#",
		children: "View documentation",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		children: "View documentation",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		children: "Upgrade your plan",
	},
};

export const Muted: Story = {
	args: {
		variant: "muted",
		children: "Terms of Service",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		children: "Reset password",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: "Manage billing",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Get started free",
	},
};

// =============================================================================
// UNDERLINE BEHAVIOR
// =============================================================================

export const UnderlineOnHover: Story = {
	args: {
		underlineOnHover: true,
		children: "Forgot your password?",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithRightIcon: Story = {
	args: {
		rightIcon: <ArrowRight size="1em" />,
		children: "Read the changelog",
	},
};

export const ExternalLinkWithIcon: Story = {
	args: {
		href: "https://status.example.com",
		target: "_blank",
		rightIcon: <ExternalLink size="1em" />,
		children: "View system status",
	},
};

// =============================================================================
// INLINE USAGE
// =============================================================================

export const InlineText: Story = {
	render: () => (
		<p style={{ maxWidth: "400px", lineHeight: 1.6 }}>
			Your export is ready. <Link href="#">Download the CSV</Link> now, or{" "}
			<Link href="#">view it in the reports dashboard</Link> instead.
		</p>
	),
};

export const InlineMuted: Story = {
	render: () => (
		<p
			style={{
				maxWidth: "400px",
				lineHeight: 1.6,
				color: "var(--color-muted)",
			}}
		>
			By signing up, you agree to our{" "}
			<Link href="#" variant="muted">
				Terms of Service
			</Link>{" "}
			and{" "}
			<Link href="#" variant="muted">
				Privacy Policy
			</Link>
			.
		</p>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllVariants: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
			<Link href="#" variant="default">
				View documentation
			</Link>
			<Link href="#" variant="primary">
				Upgrade your plan
			</Link>
			<Link href="#" variant="muted">
				Terms of Service
			</Link>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
			<Link href="#" size="sm">
				Reset password
			</Link>
			<Link href="#" size="md">
				Manage billing
			</Link>
			<Link href="#" size="lg">
				Get started free
			</Link>
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
					Account settings
				</p>
				<div style={{ display: "flex", gap: "1rem" }}>
					<Link href="#">Manage billing</Link>
					<Link href="#" variant="primary">
						Upgrade your plan
					</Link>
					<Link href="#" variant="muted">
						Deactivate account
					</Link>
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
					Docs and status
				</p>
				<div style={{ display: "flex", gap: "1rem" }}>
					<Link href="#" rightIcon={<ArrowRight size="1em" />}>
						Read the changelog
					</Link>
					<Link
						href="#"
						target="_blank"
						rightIcon={<ExternalLink size="1em" />}
					>
						View system status
					</Link>
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
					Auth screen and footer
				</p>
				<div style={{ display: "flex", gap: "1rem" }}>
					<Link href="#" underlineOnHover>
						Forgot your password?
					</Link>
					<Link href="#" underlineOnHover variant="muted">
						Privacy Policy
					</Link>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
