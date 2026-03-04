import type { Meta, StoryObj } from "@storybook/react";
import { Stack } from "./Stack";

const meta: Meta<typeof Stack> = {
	title: "Layout/Stack",
	component: Stack,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		direction: {
			control: "select",
			options: ["row", "column", "row-reverse", "column-reverse"],
		},
		align: {
			control: "select",
			options: ["start", "center", "end", "stretch", "baseline"],
		},
		justify: {
			control: "select",
			options: ["start", "center", "end", "between", "around", "evenly"],
		},
		gap: {
			control: "select",
			options: ["0", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
		},
		animate: {
			control: "boolean",
			description: "Enable stagger animation for stack items",
		},
		staggerDelay: {
			control: { type: "range", min: 0.05, max: 0.3, step: 0.01 },
			description: "Delay between each item animation",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
	<div
		style={{
			background: "var(--color-primary)",
			color: "white",
			padding: "1rem 1.5rem",
			borderRadius: "var(--radius-md)",
		}}
	>
		{children}
	</div>
);

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		children: (
			<>
				<Box>Item 1</Box>
				<Box>Item 2</Box>
				<Box>Item 3</Box>
			</>
		),
	},
};

export const Row: Story = {
	args: {
		direction: "row",
		children: (
			<>
				<Box>Item 1</Box>
				<Box>Item 2</Box>
				<Box>Item 3</Box>
			</>
		),
	},
};

export const Column: Story = {
	args: {
		direction: "column",
		children: (
			<>
				<Box>Item 1</Box>
				<Box>Item 2</Box>
				<Box>Item 3</Box>
			</>
		),
	},
};

// =============================================================================
// ALIGNMENT
// =============================================================================

export const CenterAligned: Story = {
	args: {
		direction: "row",
		align: "center",
		children: (
			<>
				<Box>Short</Box>
				<Box>Medium Height</Box>
				<Box>
					Tall
					<br />
					Item
				</Box>
			</>
		),
	},
};

export const SpaceBetween: Story = {
	args: {
		direction: "row",
		justify: "between",
		children: (
			<>
				<Box>Left</Box>
				<Box>Right</Box>
			</>
		),
	},
	decorators: [
		(Story) => (
			<div style={{ width: "400px" }}>
				<Story />
			</div>
		),
	],
};

// =============================================================================
// SPACING
// =============================================================================

export const NoGap: Story = {
	args: {
		direction: "row",
		gap: "0",
		children: (
			<>
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
			</>
		),
	},
};

export const LargeGap: Story = {
	args: {
		direction: "row",
		gap: "xl",
		children: (
			<>
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
			</>
		),
	},
};

// =============================================================================
// WRAP
// =============================================================================

export const Wrapped: Story = {
	args: {
		direction: "row",
		wrap: true,
		gap: "md",
		children: (
			<>
				<Box>Item 1</Box>
				<Box>Item 2</Box>
				<Box>Item 3</Box>
				<Box>Item 4</Box>
				<Box>Item 5</Box>
				<Box>Item 6</Box>
			</>
		),
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
// SHOWCASE
// =============================================================================

export const Gaps: Story = {
	render: () => (
		<Stack gap="lg">
			{(["xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
				<Stack key={gap} direction="row" gap={gap}>
					<Box>Gap {gap}</Box>
					<Box>Gap {gap}</Box>
					<Box>Gap {gap}</Box>
				</Stack>
			))}
		</Stack>
	),
};

export const NavbarExample: Story = {
	render: () => (
		<Stack
			direction="row"
			justify="between"
			align="center"
			style={{ padding: "1rem" }}
		>
			<Box>Logo</Box>
			<Stack direction="row" gap="md">
				<Box>Home</Box>
				<Box>About</Box>
				<Box>Contact</Box>
			</Stack>
		</Stack>
	),
	decorators: [
		(Story) => (
			<div style={{ width: "600px" }}>
				<Story />
			</div>
		),
	],
};

// =============================================================================
// ANIMATED
// =============================================================================

export const Animated: Story = {
	render: () => (
		<Stack gap="lg" animate>
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "1.5rem",
				}}
			>
				<h3 style={{ margin: "0 0 0.5rem" }}>First Section</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This section animates in first.
				</p>
			</div>
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "1.5rem",
				}}
			>
				<h3 style={{ margin: "0 0 0.5rem" }}>Second Section</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This section animates in second.
				</p>
			</div>
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "1.5rem",
				}}
			>
				<h3 style={{ margin: "0 0 0.5rem" }}>Third Section</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This section animates in third.
				</p>
			</div>
		</Stack>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Stack children animate in with a stagger effect. Refresh to see animation.",
			},
		},
	},
};

export const AnimatedDashboard: Story = {
	render: () => (
		<Stack gap="lg" animate staggerDelay={0.15}>
			{/* Stats Row */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(4, 1fr)",
					gap: "var(--space-4)",
				}}
			>
				{["Revenue", "Users", "Orders", "Growth"].map((label) => (
					<div
						key={label}
						style={{
							background: "var(--color-surface)",
							border: "1px solid var(--color-border)",
							borderRadius: "var(--radius-lg)",
							padding: "1rem",
						}}
					>
						<p
							style={{
								margin: 0,
								color: "var(--color-muted)",
								fontSize: "var(--font-size-sm)",
							}}
						>
							{label}
						</p>
						<p
							style={{
								margin: "0.25rem 0 0",
								fontSize: "var(--font-size-xl)",
								fontWeight: 700,
							}}
						>
							$12,345
						</p>
					</div>
				))}
			</div>

			{/* Chart Section */}
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "1.5rem",
					height: "200px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "var(--color-muted)",
				}}
			>
				Chart Placeholder
			</div>

			{/* Table Section */}
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "1.5rem",
				}}
			>
				<h3 style={{ margin: "0 0 1rem" }}>Recent Activity</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Table content would go here...
				</p>
			</div>
		</Stack>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Dashboard layout with staggered sections. Each major section animates in sequence.",
			},
		},
	},
};
