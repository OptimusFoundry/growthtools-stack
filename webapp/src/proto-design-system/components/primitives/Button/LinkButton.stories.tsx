import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
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
		href: "#",
		children: "Link Button",
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
		children: "Default Link",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Primary: Story = {
	args: {
		variant: "primary",
		children: "Primary Link",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary Link",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Ghost Link",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline Link",
	},
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithLeftIcon: Story = {
	args: {
		leftIcon: <FileText size="1em" />,
		children: "Documentation",
	},
};

export const WithRightIcon: Story = {
	args: {
		rightIcon: <ArrowRight size="1em" />,
		children: "Learn More",
	},
};

export const ExternalLinkExample: Story = {
	args: {
		href: "https://example.com",
		target: "_blank",
		rightIcon: <ExternalLink size="1em" />,
		children: "Visit Website",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small Link",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large Link",
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
			<LinkButton variant="default" href="#">
				Default
			</LinkButton>
			<LinkButton variant="primary" href="#">
				Primary
			</LinkButton>
			<LinkButton variant="secondary" href="#">
				Secondary
			</LinkButton>
			<LinkButton variant="ghost" href="#">
				Ghost
			</LinkButton>
			<LinkButton variant="outline" href="#">
				Outline
			</LinkButton>
		</div>
	),
};

export const NavigationExample: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<LinkButton variant="ghost" href="#" leftIcon={<FileText size="1em" />}>
				Docs
			</LinkButton>
			<LinkButton
				variant="primary"
				href="#"
				rightIcon={<ArrowRight size="1em" />}
			>
				Get Started
			</LinkButton>
			<LinkButton
				variant="outline"
				href="https://github.com"
				target="_blank"
				rightIcon={<ExternalLink size="1em" />}
			>
				GitHub
			</LinkButton>
		</div>
	),
};
