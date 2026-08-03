import type { Meta, StoryObj } from "@storybook/react-vite";
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

const sampleImage = "https://i.pravatar.cc/150?img=32";

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		src: sampleImage,
		alt: "Priya Nair",
	},
};

// =============================================================================
// WITH INITIALS
// =============================================================================

export const WithInitials: Story = {
	args: {
		initials: "PN",
	},
};

export const SingleInitial: Story = {
	args: {
		initials: "M",
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
		src: "https://cdn.launchpad.dev/avatars/missing.jpg",
		alt: "Deactivated account",
		initials: "DA",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const ExtraSmall: Story = {
	args: {
		size: "xs",
		initials: "AK",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		initials: "RB",
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		initials: "LT",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		initials: "SM",
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
		initials: "JW",
	},
};

export const Size2XL: Story = {
	args: {
		size: "2xl",
		initials: "CO",
	},
};

// =============================================================================
// VARIANTS (SHAPES)
// =============================================================================

export const Circle: Story = {
	args: {
		variant: "circle",
		src: sampleImage,
		alt: "Team member avatar, circle shape",
	},
};

export const Rounded: Story = {
	args: {
		variant: "rounded",
		src: sampleImage,
		alt: "Team member avatar, rounded shape",
	},
};

export const Square: Story = {
	args: {
		variant: "square",
		src: sampleImage,
		alt: "Team member avatar, square shape",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllSizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
			<Avatar size="xs" initials="AK" />
			<Avatar size="sm" initials="RB" />
			<Avatar size="md" initials="LT" />
			<Avatar size="lg" initials="SM" />
			<Avatar size="xl" initials="JW" />
			<Avatar size="2xl" initials="CO" />
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

export const Showcase: Story = {
	name: "Showcase: Team members list",
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1.5rem",
				width: "320px",
			}}
		>
			<div>
				<p
					style={{
						marginBottom: "0.75rem",
						fontSize: "0.875rem",
						color: "var(--color-muted)",
					}}
				>
					Design team
				</p>
				<div style={{ display: "flex" }}>
					{[
						{ img: 5, alt: "Priya Nair" },
						{ img: 12, alt: "Marcus Webb" },
						{ img: 47, alt: "Elena Torres" },
						{ img: 23, alt: "Sam Okafor" },
					].map((person, i) => (
						<div key={person.alt} style={{ marginLeft: i > 0 ? "-0.5rem" : 0 }}>
							<Avatar
								src={`https://i.pravatar.cc/150?img=${person.img}`}
								alt={person.alt}
								size="md"
								style={{ border: "2px solid var(--color-surface)" }}
							/>
						</div>
					))}
					<div style={{ marginLeft: "-0.5rem" }}>
						<Avatar
							initials="+3"
							size="md"
							style={{ border: "2px solid var(--color-surface)" }}
						/>
					</div>
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
					Pending invites (no photo yet)
				</p>
				<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
					<Avatar size="md" initials="TB" />
					<Avatar size="md" initials="JW" />
					<Avatar size="md" fallback={<User size="60%" />} />
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
