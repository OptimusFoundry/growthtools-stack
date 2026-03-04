import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
	title: "Primitives/Skeleton",
	component: Skeleton,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A skeleton loading placeholder component with shimmer animation. Use to indicate content is loading.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["text", "circular", "rectangular", "rounded"],
			description: "Shape variant",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: "text" },
			},
		},
		width: {
			control: "text",
			description: "Width (CSS value or number for px)",
		},
		height: {
			control: "text",
			description: "Height (CSS value or number for px)",
		},
		disableAnimation: {
			control: "boolean",
			description: "Disable shimmer animation",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEFAULT
// =============================================================================

export const Default: Story = {
	args: {
		width: 200,
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Text: Story = {
	args: {
		variant: "text",
		width: 200,
	},
};

export const Circular: Story = {
	args: {
		variant: "circular",
		width: 48,
		height: 48,
	},
};

export const Rectangular: Story = {
	args: {
		variant: "rectangular",
		width: 200,
		height: 120,
	},
};

export const Rounded: Story = {
	args: {
		variant: "rounded",
		width: 200,
		height: 120,
	},
};

// =============================================================================
// CUSTOM SIZES
// =============================================================================

export const CustomWidth: Story = {
	args: {
		variant: "text",
		width: "80%",
	},
	decorators: [
		(Story) => (
			<div style={{ width: 300 }}>
				<Story />
			</div>
		),
	],
};

export const CustomDimensions: Story = {
	args: {
		variant: "rounded",
		width: 300,
		height: 200,
	},
};

// =============================================================================
// DISABLED ANIMATION
// =============================================================================

export const NoAnimation: Story = {
	args: {
		variant: "text",
		width: 200,
		disableAnimation: true,
	},
};

// =============================================================================
// COMMON PATTERNS
// =============================================================================

export const TextLines: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.5rem",
				width: 300,
			}}
		>
			<Skeleton variant="text" />
			<Skeleton variant="text" />
			<Skeleton variant="text" width="80%" />
		</div>
	),
};

export const CardSkeleton: Story = {
	render: () => (
		<div
			style={{
				width: 300,
				padding: "1rem",
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-lg)",
			}}
		>
			<Skeleton
				variant="rectangular"
				height={140}
				style={{ marginBottom: "1rem" }}
			/>
			<Skeleton variant="text" style={{ marginBottom: "0.5rem" }} />
			<Skeleton variant="text" width="60%" />
		</div>
	),
};

export const ProfileSkeleton: Story = {
	render: () => (
		<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
			<Skeleton variant="circular" width={48} height={48} />
			<div style={{ flex: 1 }}>
				<Skeleton
					variant="text"
					width={120}
					style={{ marginBottom: "0.25rem" }}
				/>
				<Skeleton variant="text" width={80} height="0.875em" />
			</div>
		</div>
	),
};

export const ListSkeleton: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				width: 300,
			}}
		>
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
				>
					<Skeleton variant="circular" width={40} height={40} />
					<div style={{ flex: 1 }}>
						<Skeleton variant="text" style={{ marginBottom: "0.25rem" }} />
						<Skeleton variant="text" width="70%" height="0.75em" />
					</div>
				</div>
			))}
		</div>
	),
};

export const TableRowSkeleton: Story = {
	render: () => (
		<div style={{ width: 500 }}>
			{[1, 2, 3, 4].map((i) => (
				<div
					key={i}
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr 100px",
						gap: "1rem",
						padding: "0.75rem 0",
						borderBottom: "1px solid var(--color-border)",
					}}
				>
					<Skeleton variant="text" />
					<Skeleton variant="text" />
					<Skeleton variant="text" />
					<Skeleton variant="rounded" height={28} />
				</div>
			))}
		</div>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

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
					Variants
				</p>
				<div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
					<Skeleton variant="text" width={100} />
					<Skeleton variant="circular" width={40} height={40} />
					<Skeleton variant="rectangular" width={80} height={60} />
					<Skeleton variant="rounded" width={80} height={60} />
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
					Text placeholder
				</p>
				<div
					style={{
						width: 250,
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					<Skeleton variant="text" />
					<Skeleton variant="text" />
					<Skeleton variant="text" width="75%" />
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
					Profile placeholder
				</p>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
					<Skeleton variant="circular" width={48} height={48} />
					<div>
						<Skeleton
							variant="text"
							width={120}
							style={{ marginBottom: "0.25rem" }}
						/>
						<Skeleton variant="text" width={80} height="0.875em" />
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
					Card placeholder
				</p>
				<div
					style={{
						width: 220,
						padding: "0.75rem",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
					}}
				>
					<Skeleton
						variant="rounded"
						height={100}
						style={{ marginBottom: "0.75rem" }}
					/>
					<Skeleton variant="text" style={{ marginBottom: "0.25rem" }} />
					<Skeleton variant="text" width="60%" />
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: "padded",
	},
};
