import type { Meta, StoryObj } from "@storybook/react";
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
		children: "Click here",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		children: "Learn more",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		children: "Primary link",
	},
};

export const Muted: Story = {
	args: {
		variant: "muted",
		children: "Muted link",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small link",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: "Medium link",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large link",
	},
};

// =============================================================================
// UNDERLINE BEHAVIOR
// =============================================================================

export const UnderlineOnHover: Story = {
	args: {
		underlineOnHover: true,
		children: "Hover to see underline",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithRightIcon: Story = {
	args: {
		rightIcon: <ArrowRight size="1em" />,
		children: "Continue reading",
	},
};

export const ExternalLinkWithIcon: Story = {
	args: {
		href: "https://example.com",
		target: "_blank",
		rightIcon: <ExternalLink size="1em" />,
		children: "Visit website",
	},
};

// =============================================================================
// INLINE USAGE
// =============================================================================

export const InlineText: Story = {
	render: () => (
		<p style={{ maxWidth: "400px", lineHeight: 1.6 }}>
			This is a paragraph with an <Link href="#">inline link</Link> that flows
			naturally within the text. You can also have{" "}
			<Link href="#">multiple links</Link> in the same paragraph.
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
				Default
			</Link>
			<Link href="#" variant="primary">
				Primary
			</Link>
			<Link href="#" variant="muted">
				Muted
			</Link>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
			<Link href="#" size="sm">
				Small
			</Link>
			<Link href="#" size="md">
				Medium
			</Link>
			<Link href="#" size="lg">
				Large
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
					Standard links
				</p>
				<div style={{ display: "flex", gap: "1rem" }}>
					<Link href="#">Default</Link>
					<Link href="#" variant="primary">
						Primary
					</Link>
					<Link href="#" variant="muted">
						Muted
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
					With icons
				</p>
				<div style={{ display: "flex", gap: "1rem" }}>
					<Link href="#" rightIcon={<ArrowRight size="1em" />}>
						Read more
					</Link>
					<Link
						href="#"
						target="_blank"
						rightIcon={<ExternalLink size="1em" />}
					>
						External
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
					Underline on hover
				</p>
				<div style={{ display: "flex", gap: "1rem" }}>
					<Link href="#" underlineOnHover>
						Subtle link
					</Link>
					<Link href="#" underlineOnHover variant="muted">
						Footer link
					</Link>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
