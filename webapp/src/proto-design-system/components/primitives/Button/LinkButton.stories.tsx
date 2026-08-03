import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, ArrowUpRight, Download, FileText } from "lucide-react";
import { LinkButton } from "./LinkButton";

const meta: Meta<typeof LinkButton> = {
	title: "Primitives/LinkButton",
	component: LinkButton,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A button-styled anchor element for navigation. Use when you need a button that navigates to a URL.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"primary",
				"secondary",
				"ghost",
				"outline",
				"destructive",
			],
			description: "Visual style variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
			description: "Size of the button",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
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
		href: "/pricing",
		children: "View pricing",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		variant: "default",
		href: "/dashboard",
		children: "Go to dashboard",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		href: "/signup",
		children: "Start free trial",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		href: "/pricing",
		children: "Compare plans",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		href: "/docs",
		children: "Read the docs",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		href: "/changelog",
		children: "View changelog",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		href: "/docs/getting-started",
		leftIcon: <FileText size="1em" />,
		children: "Getting started guide",
	},
};

export const WithRightIcon: Story = {
	args: {
		variant: "primary",
		href: "/signup",
		rightIcon: <ArrowRight size="1em" />,
		children: "Create your account",
	},
};

export const ExternalLinkExample: Story = {
	args: {
		variant: "outline",
		href: "https://github.com/launchpad-hq/launchpad",
		target: "_blank",
		rightIcon: <ArrowUpRight size="1em" />,
		children: "Star on GitHub",
	},
};

export const DownloadExample: Story = {
	args: {
		variant: "secondary",
		href: "/invoices/inv_2026_0731.pdf",
		leftIcon: <Download size="1em" />,
		children: "Download invoice",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		href: "/settings/billing",
		children: "Manage billing",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		variant: "primary",
		href: "/signup",
		children: "Get started for free",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllVariants: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				gap: "0.75rem",
				alignItems: "center",
				flexWrap: "wrap",
			}}
		>
			<LinkButton variant="default" href="/dashboard">
				Dashboard
			</LinkButton>
			<LinkButton variant="primary" href="/signup">
				Sign up
			</LinkButton>
			<LinkButton variant="secondary" href="/pricing">
				Pricing
			</LinkButton>
			<LinkButton variant="ghost" href="/docs">
				Docs
			</LinkButton>
			<LinkButton variant="outline" href="/changelog">
				Changelog
			</LinkButton>
		</div>
	),
};

export const Showcase: Story = {
	name: "Showcase: Pricing card footer",
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "2rem",
				width: "320px",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.75rem",
					padding: "1.5rem",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
				}}
			>
				<p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
					Growth plan — $79/month
				</p>
				<LinkButton
					variant="primary"
					href="/signup?plan=growth"
					rightIcon={<ArrowRight size="1em" />}
				>
					Start 14-day trial
				</LinkButton>
				<LinkButton variant="ghost" size="sm" href="/pricing#growth">
					See what's included
				</LinkButton>
			</div>

			<div
				style={{
					display: "flex",
					gap: "0.75rem",
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				<LinkButton
					variant="outline"
					href="/docs/api-keys"
					leftIcon={<FileText size="1em" />}
				>
					API reference
				</LinkButton>
				<LinkButton
					variant="ghost"
					href="https://status.launchpad.dev"
					target="_blank"
					rightIcon={<ArrowUpRight size="1em" />}
				>
					Status page
				</LinkButton>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
