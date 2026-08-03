import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text";

const meta: Meta<typeof Text> = {
	title: "Primitives/Text",
	component: Text,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A versatile typography component for rendering text with consistent styling. Supports headings, paragraphs, and inline text with various sizes, weights, and colors.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		as: {
			control: "select",
			options: [
				"p",
				"span",
				"div",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6",
				"label",
				"strong",
				"em",
			],
			description: "HTML element to render",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "p" },
			},
		},
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"],
			description: "Font size",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		weight: {
			control: "select",
			options: ["normal", "medium", "semibold", "bold"],
			description: "Font weight",
		},
		color: {
			control: "select",
			options: [
				"default",
				"muted",
				"primary",
				"secondary",
				"success",
				"warning",
				"error",
				"inherit",
			],
			description: "Text color",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		align: {
			control: "select",
			options: ["left", "center", "right", "justify"],
			description: "Text alignment",
		},
		truncate: {
			control: "boolean",
			description: "Truncate with ellipsis",
		},
		lineClamp: {
			control: "number",
			description: "Limit to N lines with ellipsis",
		},
		italic: {
			control: "boolean",
			description: "Make text italic",
		},
		underline: {
			control: "boolean",
			description: "Add underline",
		},
		strikethrough: {
			control: "boolean",
			description: "Add strikethrough",
		},
		transform: {
			control: "select",
			options: ["uppercase", "lowercase", "capitalize", "none"],
			description: "Transform text case",
		},
		nowrap: {
			control: "boolean",
			description: "Prevent text wrapping",
		},
	},
	args: {
		children: "Your subscription renews on August 14, 2026.",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		children: "Your subscription renews on August 14, 2026.",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const ExtraSmall: Story = {
	args: {
		size: "xs",
		children: "Last synced 2 minutes ago",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: "We'll email you a receipt after checkout.",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: "Invite teammates to collaborate on this workspace.",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Set up billing to unlock unlimited projects.",
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
		children: "Everything your team needs to ship faster.",
	},
};

export const Size2XL: Story = {
	args: {
		size: "2xl",
		children: "Simple pricing, no surprises.",
	},
};

export const Size3XL: Story = {
	args: {
		size: "3xl",
		children: "Built for growing teams.",
	},
};

export const Size4XL: Story = {
	args: {
		size: "4xl",
		children: "Ship your product faster.",
	},
};

export const Size5XL: Story = {
	args: {
		size: "5xl",
		children: "Launchpad",
	},
};

// =============================================================================
// WEIGHTS
// =============================================================================

export const WeightNormal: Story = {
	args: {
		weight: "normal",
		children: "Cancel anytime, no questions asked.",
	},
};

export const WeightMedium: Story = {
	args: {
		weight: "medium",
		children: "Upgrade to Pro",
	},
};

export const WeightSemibold: Story = {
	args: {
		weight: "semibold",
		children: "Payment method updated",
	},
};

export const WeightBold: Story = {
	args: {
		weight: "bold",
		children: "Action required: verify your email",
	},
};

// =============================================================================
// COLORS
// =============================================================================

export const ColorDefault: Story = {
	args: {
		color: "default",
		children: "Your API key was created successfully.",
	},
};

export const ColorMuted: Story = {
	args: {
		color: "muted",
		children: "Last updated by Priya Nair, 3 hours ago",
	},
};

export const ColorPrimary: Story = {
	args: {
		color: "primary",
		children: "View full billing history",
	},
};

export const ColorSuccess: Story = {
	args: {
		color: "success",
		children: "Webhook delivered successfully",
	},
};

export const ColorWarning: Story = {
	args: {
		color: "warning",
		children: "Your trial ends in 3 days",
	},
};

export const ColorError: Story = {
	args: {
		color: "error",
		children: "Payment failed — update your card to avoid service interruption",
	},
};

// =============================================================================
// HEADINGS
// =============================================================================

export const Heading1: Story = {
	args: {
		as: "h1",
		size: "5xl",
		weight: "bold",
		children: "Billing & subscription",
	},
};

export const Heading2: Story = {
	args: {
		as: "h2",
		size: "4xl",
		weight: "bold",
		children: "Team members",
	},
};

export const Heading3: Story = {
	args: {
		as: "h3",
		size: "3xl",
		weight: "semibold",
		children: "API keys",
	},
};

export const Heading4: Story = {
	args: {
		as: "h4",
		size: "2xl",
		weight: "semibold",
		children: "Danger zone",
	},
};

// =============================================================================
// TRUNCATION
// =============================================================================

export const Truncate: Story = {
	args: {
		truncate: true,
		children: "Q3-2026-financial-summary-final-v2-reviewed-by-finance-team.pdf",
	},
	decorators: [
		(Story) => (
			<div style={{ width: "300px" }}>
				<Story />
			</div>
		),
	],
};

export const LineClamp2: Story = {
	args: {
		lineClamp: 2,
		children:
			"Launchpad gives your team everything it needs to ship a production SaaS on day one — authentication, billing, team accounts, API keys, webhooks, and a Kafka event backbone, all wired together out of the box.",
	},
	decorators: [
		(Story) => (
			<div style={{ width: "300px" }}>
				<Story />
			</div>
		),
	],
};

export const LineClamp3: Story = {
	args: {
		lineClamp: 3,
		children:
			"When you upgrade to the Growth plan, you get unlimited team members, priority support with a 4-hour response SLA, custom webhook retries, and access to our audit log export — everything you need as your usage scales past the Starter tier.",
	},
	decorators: [
		(Story) => (
			<div style={{ width: "300px" }}>
				<Story />
			</div>
		),
	],
};

// =============================================================================
// TEXT STYLES
// =============================================================================

export const Italic: Story = {
	args: {
		as: "em",
		italic: true,
		children: "Note: this action cannot be undone.",
	},
};

export const Underline: Story = {
	args: {
		underline: true,
		children: "Terms of Service",
	},
};

export const Strikethrough: Story = {
	args: {
		strikethrough: true,
		children: "$49/month",
	},
};

// =============================================================================
// TRANSFORMS
// =============================================================================

export const Uppercase: Story = {
	args: {
		transform: "uppercase",
		size: "xs",
		weight: "medium",
		children: "Current plan",
	},
};

export const Capitalize: Story = {
	args: {
		transform: "capitalize",
		children: "workspace settings",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<Text size="5xl" weight="bold">
				5XL Bold
			</Text>
			<Text size="4xl" weight="bold">
				4XL Bold
			</Text>
			<Text size="3xl" weight="semibold">
				3XL Semibold
			</Text>
			<Text size="2xl" weight="semibold">
				2XL Semibold
			</Text>
			<Text size="xl">XL Regular</Text>
			<Text size="lg">Large Regular</Text>
			<Text size="md">Medium Regular (default)</Text>
			<Text size="sm">Small Regular</Text>
			<Text size="xs">Extra Small Regular</Text>
		</div>
	),
};

export const AllColors: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<Text color="default">Default color</Text>
			<Text color="muted">Muted color</Text>
			<Text color="primary">Primary color</Text>
			<Text color="secondary">Secondary color</Text>
			<Text color="success">Success color</Text>
			<Text color="warning">Warning color</Text>
			<Text color="error">Error color</Text>
		</div>
	),
};

export const AllWeights: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<Text weight="normal">Normal weight (400)</Text>
			<Text weight="medium">Medium weight (500)</Text>
			<Text weight="semibold">Semibold weight (600)</Text>
			<Text weight="bold">Bold weight (700)</Text>
		</div>
	),
};

export const TypographyScale: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1.5rem",
				maxWidth: "600px",
			}}
		>
			<div>
				<Text as="h1" size="4xl" weight="bold">
					Billing & subscription
				</Text>
				<Text color="muted" size="lg">
					Manage your plan, payment methods, and invoices
				</Text>
			</div>

			<div>
				<Text as="h2" size="2xl" weight="semibold">
					Current plan
				</Text>
				<Text>
					You're on the Growth plan at $79/month, billed monthly. Your next
					invoice is scheduled for August 14, 2026.
				</Text>
			</div>

			<div>
				<Text as="h3" size="xl" weight="semibold">
					Payment method
				</Text>
				<Text size="sm" color="muted">
					Visa ending in 4242, expires 09/28
				</Text>
			</div>

			<div>
				<Text size="xs" color="muted" transform="uppercase" weight="medium">
					Billing email
				</Text>
				<Text>billing@acmecorp.com</Text>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};

export const SemanticElements: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
			<Text as="p">Paragraph: Your changes have been saved.</Text>
			<Text as="span">Span: inline status indicator</Text>
			<Text as="strong" weight="bold">
				Strong: Action required
			</Text>
			<Text as="em" italic>
				Emphasis: this cannot be undone
			</Text>
			<Text as="small" size="sm">
				Small: Terms apply
			</Text>
			<Text as="del" strikethrough>
				Deleted: $49/month
			</Text>
			<Text
				as="mark"
				style={{ backgroundColor: "var(--color-warning)", padding: "0 4px" }}
			>
				Mark: trial ends in 3 days
			</Text>
			<Text as="code" style={{ fontFamily: "var(--font-family-mono)" }}>
				Code: sk_live_51H8...
			</Text>
		</div>
	),
};
