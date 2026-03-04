import type { Meta, StoryObj } from "@storybook/react";
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
		children: "The quick brown fox jumps over the lazy dog.",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		children: "The quick brown fox jumps over the lazy dog.",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const ExtraSmall: Story = {
	args: {
		size: "xs",
		children: "Extra small text (xs)",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small text (sm)",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: "Medium text (md) - Default",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large text (lg)",
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
		children: "Extra large text (xl)",
	},
};

export const Size2XL: Story = {
	args: {
		size: "2xl",
		children: "2XL text size",
	},
};

export const Size3XL: Story = {
	args: {
		size: "3xl",
		children: "3XL text size",
	},
};

export const Size4XL: Story = {
	args: {
		size: "4xl",
		children: "4XL text size",
	},
};

export const Size5XL: Story = {
	args: {
		size: "5xl",
		children: "5XL text",
	},
};

// =============================================================================
// WEIGHTS
// =============================================================================

export const WeightNormal: Story = {
	args: {
		weight: "normal",
		children: "Normal weight text",
	},
};

export const WeightMedium: Story = {
	args: {
		weight: "medium",
		children: "Medium weight text",
	},
};

export const WeightSemibold: Story = {
	args: {
		weight: "semibold",
		children: "Semibold weight text",
	},
};

export const WeightBold: Story = {
	args: {
		weight: "bold",
		children: "Bold weight text",
	},
};

// =============================================================================
// COLORS
// =============================================================================

export const ColorDefault: Story = {
	args: {
		color: "default",
		children: "Default color text",
	},
};

export const ColorMuted: Story = {
	args: {
		color: "muted",
		children: "Muted color text",
	},
};

export const ColorPrimary: Story = {
	args: {
		color: "primary",
		children: "Primary color text",
	},
};

export const ColorSuccess: Story = {
	args: {
		color: "success",
		children: "Success color text",
	},
};

export const ColorWarning: Story = {
	args: {
		color: "warning",
		children: "Warning color text",
	},
};

export const ColorError: Story = {
	args: {
		color: "error",
		children: "Error color text",
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
		children: "Heading 1",
	},
};

export const Heading2: Story = {
	args: {
		as: "h2",
		size: "4xl",
		weight: "bold",
		children: "Heading 2",
	},
};

export const Heading3: Story = {
	args: {
		as: "h3",
		size: "3xl",
		weight: "semibold",
		children: "Heading 3",
	},
};

export const Heading4: Story = {
	args: {
		as: "h4",
		size: "2xl",
		weight: "semibold",
		children: "Heading 4",
	},
};

// =============================================================================
// TRUNCATION
// =============================================================================

export const Truncate: Story = {
	args: {
		truncate: true,
		children:
			"This is a very long text that will be truncated with an ellipsis when it exceeds the available width of its container.",
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
			"This is a multi-line text that will be clamped to 2 lines. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
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
			"This is a multi-line text that will be clamped to 3 lines. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
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
		italic: true,
		children: "This text is italic",
	},
};

export const Underline: Story = {
	args: {
		underline: true,
		children: "This text is underlined",
	},
};

export const Strikethrough: Story = {
	args: {
		strikethrough: true,
		children: "This text has strikethrough",
	},
};

// =============================================================================
// TRANSFORMS
// =============================================================================

export const Uppercase: Story = {
	args: {
		transform: "uppercase",
		children: "uppercase text",
	},
};

export const Capitalize: Story = {
	args: {
		transform: "capitalize",
		children: "capitalized text example",
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
					Page Title
				</Text>
				<Text color="muted" size="lg">
					A brief description or subtitle for the page
				</Text>
			</div>

			<div>
				<Text as="h2" size="2xl" weight="semibold">
					Section Heading
				</Text>
				<Text>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
					eiusmod tempor incididunt ut labore et dolore magna aliqua.
				</Text>
			</div>

			<div>
				<Text as="h3" size="xl" weight="semibold">
					Subsection Heading
				</Text>
				<Text size="sm" color="muted">
					Helper text or additional context in a smaller, muted style.
				</Text>
			</div>

			<div>
				<Text size="xs" color="muted" transform="uppercase" weight="medium">
					Label Text
				</Text>
				<Text>Regular body text that follows a label.</Text>
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
			<Text as="p">Paragraph element (p)</Text>
			<Text as="span">Span element (span)</Text>
			<Text as="strong" weight="bold">
				Strong element (strong)
			</Text>
			<Text as="em" italic>
				Emphasis element (em)
			</Text>
			<Text as="small" size="sm">
				Small element (small)
			</Text>
			<Text as="del" strikethrough>
				Deleted element (del)
			</Text>
			<Text
				as="mark"
				style={{ backgroundColor: "var(--color-warning)", padding: "0 4px" }}
			>
				Mark element (mark)
			</Text>
			<Text as="code" style={{ fontFamily: "var(--font-family-mono)" }}>
				Code element (code)
			</Text>
		</div>
	),
};
