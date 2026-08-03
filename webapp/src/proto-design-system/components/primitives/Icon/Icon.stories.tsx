import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	AlertCircle,
	Check,
	ChevronRight,
	Heart,
	Home,
	Mail,
	Search,
	Settings,
	Star,
	User,
} from "lucide-react";
import { Icon } from "./Icon";

const meta: Meta<typeof Icon> = {
	title: "Primitives/Icon",
	component: Icon,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A wrapper component for Lucide icons providing consistent sizing and colors. Use with any Lucide icon.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		icon: {
			control: false,
			description: "Lucide icon component",
		},
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl", "2xl"],
			description: "Size of the icon",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
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
			description: "Color of the icon",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "default" },
			},
		},
		label: {
			control: "text",
			description: "Accessible label (makes icon non-decorative)",
		},
	},
	args: {
		icon: Home,
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		icon: Home,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const ExtraSmall: Story = {
	args: {
		icon: Home,
		size: "xs",
	},
};

export const Small: Story = {
	args: {
		icon: Home,
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		icon: Home,
		size: "md",
	},
};

export const Large: Story = {
	args: {
		icon: Home,
		size: "lg",
	},
};

export const ExtraLarge: Story = {
	args: {
		icon: Home,
		size: "xl",
	},
};

export const Size2XL: Story = {
	args: {
		icon: Home,
		size: "2xl",
	},
};

// =============================================================================
// COLORS
// =============================================================================

export const ColorDefault: Story = {
	args: {
		icon: Star,
		color: "default",
	},
};

export const ColorMuted: Story = {
	args: {
		icon: Star,
		color: "muted",
	},
};

export const ColorPrimary: Story = {
	args: {
		icon: Star,
		color: "primary",
	},
};

export const ColorSuccess: Story = {
	args: {
		icon: Check,
		color: "success",
	},
};

export const ColorWarning: Story = {
	args: {
		icon: AlertCircle,
		color: "warning",
	},
};

export const ColorError: Story = {
	args: {
		icon: AlertCircle,
		color: "error",
	},
};

// =============================================================================
// WITH LABEL (ACCESSIBLE)
// =============================================================================

export const WithLabel: Story = {
	args: {
		icon: Heart,
		label: "Add to favorites",
		color: "error",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
			<Icon icon={Home} size="xs" />
			<Icon icon={Home} size="sm" />
			<Icon icon={Home} size="md" />
			<Icon icon={Home} size="lg" />
			<Icon icon={Home} size="xl" />
			<Icon icon={Home} size="2xl" />
		</div>
	),
};

export const AllColors: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
			<Icon icon={Star} color="default" size="lg" />
			<Icon icon={Star} color="muted" size="lg" />
			<Icon icon={Star} color="primary" size="lg" />
			<Icon icon={Star} color="secondary" size="lg" />
			<Icon icon={Star} color="success" size="lg" />
			<Icon icon={Star} color="warning" size="lg" />
			<Icon icon={Star} color="error" size="lg" />
		</div>
	),
};

export const CommonIcons: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				gap: "1rem",
				alignItems: "center",
				flexWrap: "wrap",
			}}
		>
			<Icon icon={Home} size="lg" />
			<Icon icon={User} size="lg" />
			<Icon icon={Settings} size="lg" />
			<Icon icon={Search} size="lg" />
			<Icon icon={Mail} size="lg" />
			<Icon icon={Heart} size="lg" />
			<Icon icon={Star} size="lg" />
			<Icon icon={Check} size="lg" />
			<Icon icon={ChevronRight} size="lg" />
			<Icon icon={AlertCircle} size="lg" />
		</div>
	),
};

export const Showcase: Story = {
	name: "Showcase: Account menu",
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.25rem",
				width: "220px",
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-lg)",
				padding: "0.5rem",
			}}
		>
			{[
				{ icon: User, label: "Your profile" },
				{ icon: Settings, label: "Workspace settings" },
				{ icon: Mail, label: "Notification preferences" },
				{ icon: Search, label: "Search everything" },
			].map((item) => (
				<span
					key={item.label}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.625rem",
						padding: "0.5rem 0.625rem",
					}}
				>
					<Icon icon={item.icon} size="sm" color="muted" />
					{item.label}
				</span>
			))}
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "0.625rem",
					padding: "0.5rem 0.625rem",
				}}
			>
				<Icon icon={Heart} size="sm" label="Starred items" color="error" />
				Starred items
			</span>
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "0.625rem",
					padding: "0.5rem 0.625rem",
				}}
			>
				<Icon icon={AlertCircle} size="sm" color="warning" />2 items need
				attention
			</span>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
