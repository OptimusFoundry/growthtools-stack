import type { Meta, StoryObj } from "@storybook/react-vite";
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

const Tile = ({ children }: { children: React.ReactNode }) => (
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

const teamMembers = [
	"Priya Patel",
	"Marcus Chen",
	"Sofia Alvarez",
	"Daniel Kim",
	"Grace Osei",
	"Liam O'Brien",
];

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		columns: "3",
		children: teamMembers.map((name) => <Tile key={name}>{name}</Tile>),
	},
};

export const TwoColumns: Story = {
	args: {
		columns: "2",
		children: (
			<>
				<Tile>Personal details</Tile>
				<Tile>Security &amp; access</Tile>
				<Tile>Billing address</Tile>
				<Tile>Notification preferences</Tile>
			</>
		),
	},
};

export const FourColumns: Story = {
	args: {
		columns: "4",
		children: (
			<>
				<Tile>Draft</Tile>
				<Tile>In review</Tile>
				<Tile>Approved</Tile>
				<Tile>Published</Tile>
			</>
		),
	},
};

export const AutoFit: Story = {
	args: {
		columns: "auto",
		children: (
			<>
				<Tile>api-keys</Tile>
				<Tile>webhooks</Tile>
				<Tile>billing</Tile>
				<Tile>team</Tile>
				<Tile>integrations</Tile>
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
				<Tile>Starter</Tile>
				<Tile>Pro</Tile>
				<Tile>Enterprise</Tile>
			</>
		),
	},
};

export const DifferentGaps: Story = {
	args: {
		columns: "3",
		rowGap: "xl",
		columnGap: "sm",
		children: teamMembers.map((name) => <Tile key={name}>{name}</Tile>),
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
					<Tile>Free plan</Tile>
					<Tile>Pro plan</Tile>
				</Grid>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					3 Columns
				</p>
				<Grid columns="3" gap="md">
					<Tile>Starter</Tile>
					<Tile>Pro</Tile>
					<Tile>Enterprise</Tile>
				</Grid>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					4 Columns
				</p>
				<Grid columns="4" gap="md">
					<Tile>Draft</Tile>
					<Tile>In review</Tile>
					<Tile>Approved</Tile>
					<Tile>Published</Tile>
				</Grid>
			</div>
		</div>
	),
};

export const CardLayout: Story = {
	render: () => (
		<Grid columns="auto" gap="lg">
			{[
				{
					title: "API Keys",
					description: "Generate and revoke keys for programmatic access.",
				},
				{
					title: "Webhooks",
					description: "Subscribe to account events and replay failures.",
				},
				{
					title: "Team members",
					description: "Invite teammates and manage their roles.",
				},
				{
					title: "Billing",
					description: "View invoices and update your payment method.",
				},
				{
					title: "Audit log",
					description: "Track every change made across your workspace.",
				},
				{
					title: "Integrations",
					description: "Connect Slack, Linear, and GitHub.",
				},
			].map((card) => (
				<div
					key={card.title}
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
						{card.title}
					</h3>
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						{card.description}
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
			{[
				{
					title: "API Keys",
					description: "Generate and revoke keys for programmatic access.",
				},
				{
					title: "Webhooks",
					description: "Subscribe to account events and replay failures.",
				},
				{
					title: "Team members",
					description: "Invite teammates and manage their roles.",
				},
				{
					title: "Billing",
					description: "View invoices and update your payment method.",
				},
				{
					title: "Audit log",
					description: "Track every change made across your workspace.",
				},
				{
					title: "Integrations",
					description: "Connect Slack, Linear, and GitHub.",
				},
			].map((card) => (
				<div
					key={card.title}
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
						{card.title}
					</h3>
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						{card.description}
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

// =============================================================================
// RESPONSIVE COLUMNS (new in Phase 0)
// =============================================================================

export const ResponsiveColumns: Story = {
	render: () => (
		<Grid columns={{ base: "1", sm: "2", lg: "4" }} gap="md">
			{["API Keys", "Webhooks", "Team members", "Billing"].map((label) => (
				<div
					key={label}
					style={{
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-lg)",
						padding: "1.5rem",
						minHeight: "6rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<span
						style={{
							color: "var(--color-muted)",
							fontSize: "var(--font-size-sm)",
						}}
					>
						{label}
					</span>
				</div>
			))}
		</Grid>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Responsive column count: 1 column on mobile, 2 on sm, 4 on lg+. Uses the Responsive<T> object syntax: `columns={{ base: 1, sm: 2, lg: 4 }}`.",
			},
		},
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const SettingsGridShowcase: Story = {
	render: () => (
		<Grid columns={{ base: "1", md: "2" }} gap="lg">
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "1.5rem",
				}}
			>
				<h3 style={{ margin: "0 0 0.5rem" }}>Profile</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Priya Patel · priya@acme.com · Admin
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
				<h3 style={{ margin: "0 0 0.5rem" }}>Two-factor authentication</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Enabled via authenticator app since Jan 4, 2026.
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
				<h3 style={{ margin: "0 0 0.5rem" }}>Current plan</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Pro · $49/month · renews Sep 12, 2026.
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
				<h3 style={{ margin: "0 0 0.5rem" }}>API usage</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					84,201 of 100,000 monthly requests used.
				</p>
			</div>
		</Grid>
	),
};
