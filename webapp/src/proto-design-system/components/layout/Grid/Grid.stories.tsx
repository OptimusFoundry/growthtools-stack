import type { Meta, StoryObj } from "@storybook/react";
import { Grid } from "./Grid";

const meta: Meta<typeof Grid> = {
	title: "Layout/Grid",
	component: Grid,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		columns: {
			control: "select",
			options: ["1", "2", "3", "4", "5", "6", "12", "auto"],
		},
		gap: {
			control: "select",
			options: ["0", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
		},
		animate: {
			control: "boolean",
			description: "Enable stagger animation for grid items",
		},
		staggerDelay: {
			control: { type: "range", min: 0.02, max: 0.2, step: 0.01 },
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
			padding: "2rem",
			borderRadius: "var(--radius-md)",
			textAlign: "center",
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
		columns: "3",
		children: (
			<>
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
				<Box>4</Box>
				<Box>5</Box>
				<Box>6</Box>
			</>
		),
	},
};

export const TwoColumns: Story = {
	args: {
		columns: "2",
		children: (
			<>
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
				<Box>4</Box>
			</>
		),
	},
};

export const FourColumns: Story = {
	args: {
		columns: "4",
		children: (
			<>
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
				<Box>4</Box>
			</>
		),
	},
};

export const AutoFit: Story = {
	args: {
		columns: "auto",
		children: (
			<>
				<Box>Auto 1</Box>
				<Box>Auto 2</Box>
				<Box>Auto 3</Box>
				<Box>Auto 4</Box>
				<Box>Auto 5</Box>
			</>
		),
	},
};

// =============================================================================
// SPACING
// =============================================================================

export const LargeGap: Story = {
	args: {
		columns: "3",
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

export const DifferentGaps: Story = {
	args: {
		columns: "3",
		rowGap: "xl",
		columnGap: "sm",
		children: (
			<>
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
				<Box>4</Box>
				<Box>5</Box>
				<Box>6</Box>
			</>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const ColumnVariations: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					2 Columns
				</p>
				<Grid columns="2" gap="md">
					<Box>1</Box>
					<Box>2</Box>
				</Grid>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					3 Columns
				</p>
				<Grid columns="3" gap="md">
					<Box>1</Box>
					<Box>2</Box>
					<Box>3</Box>
				</Grid>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					4 Columns
				</p>
				<Grid columns="4" gap="md">
					<Box>1</Box>
					<Box>2</Box>
					<Box>3</Box>
					<Box>4</Box>
				</Grid>
			</div>
		</div>
	),
};

export const CardLayout: Story = {
	render: () => (
		<Grid columns="auto" gap="lg">
			{[1, 2, 3, 4, 5, 6].map((i) => (
				<div
					key={i}
					style={{
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-lg)",
						padding: "1.5rem",
					}}
				>
					<h3
						style={{ margin: "0 0 0.5rem", color: "var(--color-base-content)" }}
					>
						Card {i}
					</h3>
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						Card content goes here with some description text.
					</p>
				</div>
			))}
		</Grid>
	),
};

// =============================================================================
// ANIMATED
// =============================================================================

export const Animated: Story = {
	render: () => (
		<Grid columns="3" gap="lg" animate>
			{[1, 2, 3, 4, 5, 6].map((i) => (
				<div
					key={i}
					style={{
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-lg)",
						padding: "1.5rem",
					}}
				>
					<h3
						style={{ margin: "0 0 0.5rem", color: "var(--color-base-content)" }}
					>
						Card {i}
					</h3>
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						Items stagger in on mount. Refresh to see animation.
					</p>
				</div>
			))}
		</Grid>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Grid items animate in with a stagger effect on mount. Refresh the page to see the animation.",
			},
		},
	},
};

export const AnimatedDashboard: Story = {
	render: () => (
		<Grid columns="4" gap="md" animate staggerDelay={0.08}>
			{[
				{ label: "Total Revenue", value: "$45,231", change: "+20.1%" },
				{ label: "Subscriptions", value: "2,350", change: "+180.1%" },
				{ label: "Sales", value: "12,234", change: "+19%" },
				{ label: "Active Now", value: "573", change: "+201" },
			].map((stat) => (
				<div
					key={stat.label}
					style={{
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-lg)",
						padding: "1.25rem",
					}}
				>
					<p
						style={{
							margin: "0 0 0.5rem",
							color: "var(--color-muted)",
							fontSize: "var(--font-size-sm)",
						}}
					>
						{stat.label}
					</p>
					<p
						style={{
							margin: 0,
							fontSize: "var(--font-size-2xl)",
							fontWeight: 700,
						}}
					>
						{stat.value}
					</p>
					<p
						style={{
							margin: "0.25rem 0 0",
							color: "var(--color-success)",
							fontSize: "var(--font-size-xs)",
						}}
					>
						{stat.change}
					</p>
				</div>
			))}
		</Grid>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Dashboard stats with stagger animation. Custom staggerDelay for a slightly slower reveal.",
			},
		},
	},
};
