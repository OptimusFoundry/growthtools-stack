import type { Meta, StoryObj } from "@storybook/react";
import { User } from "lucide-react";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
	title: "Primitives/Avatar",
	component: Avatar,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"An avatar component for displaying user profile images, initials, or fallback icons. Supports multiple sizes and shapes.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "xl", "2xl"],
			description: "Size of the avatar",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "md" },
			},
		},
		variant: {
			control: "select",
			options: ["circle", "rounded", "square"],
			description: "Shape variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "circle" },
			},
		},
		src: {
			control: "text",
			description: "Image source URL",
		},
		alt: {
			control: "text",
			description: "Alt text for the image",
		},
		initials: {
			control: "text",
			description: "Fallback initials",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample avatar URL (placeholder)
const sampleImage = "https://i.pravatar.cc/150?img=1";

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		src: sampleImage,
		alt: "John Doe",
	},
};

// =============================================================================
// WITH INITIALS
// =============================================================================

export const WithInitials: Story = {
	args: {
		initials: "JD",
	},
};

export const SingleInitial: Story = {
	args: {
		initials: "A",
	},
};

// =============================================================================
// FALLBACK
// =============================================================================

export const DefaultFallback: Story = {
	args: {},
};

export const CustomFallback: Story = {
	args: {
		fallback: <User size="60%" />,
	},
};

export const BrokenImage: Story = {
	args: {
		src: "https://broken-url.com/image.jpg",
		alt: "Broken image",
		initials: "BI",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const ExtraSmall: Story = {
	args: {
		size: "xs",
		initials: "XS",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		initials: "SM",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		initials: "MD",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		initials: "LG",
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
		initials: "XL",
	},
};

export const Size2XL: Story = {
	args: {
		size: "2xl",
		initials: "2X",
	},
};

// =============================================================================
// VARIANTS (SHAPES)
// =============================================================================

export const Circle: Story = {
	args: {
		variant: "circle",
		src: sampleImage,
		alt: "Circle avatar",
	},
};

export const Rounded: Story = {
	args: {
		variant: "rounded",
		src: sampleImage,
		alt: "Rounded avatar",
	},
};

export const Square: Story = {
	args: {
		variant: "square",
		src: sampleImage,
		alt: "Square avatar",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Avatar size="xs" initials="XS" />
			<Avatar size="sm" initials="SM" />
			<Avatar size="md" initials="MD" />
			<Avatar size="lg" initials="LG" />
			<Avatar size="xl" initials="XL" />
			<Avatar size="2xl" initials="2X" />
		</div>
	),
};

export const AllSizesWithImage: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Avatar size="xs" src="https://i.pravatar.cc/150?img=1" alt="User" />
			<Avatar size="sm" src="https://i.pravatar.cc/150?img=2" alt="User" />
			<Avatar size="md" src="https://i.pravatar.cc/150?img=3" alt="User" />
			<Avatar size="lg" src="https://i.pravatar.cc/150?img=4" alt="User" />
			<Avatar size="xl" src="https://i.pravatar.cc/150?img=5" alt="User" />
			<Avatar size="2xl" src="https://i.pravatar.cc/150?img=6" alt="User" />
		</div>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
			<Avatar variant="circle" size="lg" src={sampleImage} alt="Circle" />
			<Avatar variant="rounded" size="lg" src={sampleImage} alt="Rounded" />
			<Avatar variant="square" size="lg" src={sampleImage} alt="Square" />
		</div>
	),
};

export const AvatarGroup: Story = {
	render: () => (
		<div style={{ display: "flex" }}>
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} style={{ marginLeft: i > 1 ? "-0.5rem" : 0 }}>
					<Avatar
						src={`https://i.pravatar.cc/150?img=${i}`}
						alt={`User ${i}`}
						size="md"
						style={{ border: "2px solid var(--color-surface)" }}
					/>
				</div>
			))}
		</div>
	),
};

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					With images
				</p>
				<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
					<Avatar size="sm" src="https://i.pravatar.cc/150?img=10" alt="User" />
					<Avatar size="md" src="https://i.pravatar.cc/150?img=11" alt="User" />
					<Avatar size="lg" src="https://i.pravatar.cc/150?img=12" alt="User" />
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					With initials
				</p>
				<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
					<Avatar size="sm" initials="AB" />
					<Avatar size="md" initials="CD" />
					<Avatar size="lg" initials="EF" />
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Shape variants
				</p>
				<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
					<Avatar variant="circle" initials="CI" />
					<Avatar variant="rounded" initials="RO" />
					<Avatar variant="square" initials="SQ" />
				</div>
			</div>

			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Fallback states
				</p>
				<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
					<Avatar />
					<Avatar fallback={<User size="60%" />} />
					<Avatar initials="FB" />
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
