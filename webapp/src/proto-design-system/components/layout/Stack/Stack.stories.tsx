import type { Meta, StoryObj } from "@storybook/react-vite";
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

const Chip = ({ children }: { children: React.ReactNode }) => (
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
				<Chip>API Keys</Chip>
				<Chip>Webhooks</Chip>
				<Chip>Team Members</Chip>
			</>
		),
	},
};

export const Row: Story = {
	args: {
		direction: "row",
		children: (
			<>
				<Chip>Draft</Chip>
				<Chip>In Review</Chip>
				<Chip>Published</Chip>
			</>
		),
	},
};

export const Column: Story = {
	args: {
		direction: "column",
		children: (
			<>
				<Chip>Personal info</Chip>
				<Chip>Password &amp; security</Chip>
				<Chip>Notification preferences</Chip>
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
				<Chip>Active</Chip>
				<Chip>Awaiting approval</Chip>
				<Chip>
					Blocked by
					<br />
					dependency
				</Chip>
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
				<Chip>Free plan</Chip>
				<Chip>Upgrade</Chip>
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
				<Chip>Mon</Chip>
				<Chip>Tue</Chip>
				<Chip>Wed</Chip>
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
				<Chip>Overview</Chip>
				<Chip>Usage</Chip>
				<Chip>Invoices</Chip>
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
				<Chip>billing</Chip>
				<Chip>auth</Chip>
				<Chip>onboarding</Chip>
				<Chip>webhooks</Chip>
				<Chip>api-keys</Chip>
				<Chip>notifications</Chip>
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
					<Chip>gap="{gap}"</Chip>
					<Chip>gap="{gap}"</Chip>
					<Chip>gap="{gap}"</Chip>
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
			<Chip>Acme Analytics</Chip>
			<Stack direction="row" gap="md">
				<Chip>Dashboard</Chip>
				<Chip>Reports</Chip>
				<Chip>Settings</Chip>
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
				<h3 style={{ margin: "0 0 0.5rem" }}>Connect your workspace</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Link Slack, Linear, or GitHub to start syncing activity.
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
				<h3 style={{ margin: "0 0 0.5rem" }}>Invite your team</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Add teammates by email — they'll get access once they accept.
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
				<h3 style={{ margin: "0 0 0.5rem" }}>Set a billing contact</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Invoices and renewal reminders go to this address.
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
				{[
					{ label: "Revenue", value: "$45,231" },
					{ label: "Active Subscriptions", value: "2,350" },
					{ label: "Open Support Tickets", value: "12" },
					{ label: "Trial Conversions", value: "38%" },
				].map((stat) => (
					<div
						key={stat.label}
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
							{stat.label}
						</p>
						<p
							style={{
								margin: "0.25rem 0 0",
								fontSize: "var(--font-size-xl)",
								fontWeight: 700,
							}}
						>
							{stat.value}
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
				Monthly recurring revenue, last 12 months
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
				<h3 style={{ margin: "0 0 1rem" }}>Recent activity</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Priya Patel upgraded to the Pro plan · 12 minutes ago
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
