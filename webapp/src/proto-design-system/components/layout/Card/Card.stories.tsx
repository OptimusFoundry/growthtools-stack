import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardBody, CardFooter, CardHeader } from "./Card";

const meta: Meta<typeof Card> = {
	title: "Layout/Card",
	component: Card,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["elevated", "outlined", "filled", "spec"],
		},
		padding: {
			control: "select",
			options: ["none", "sm", "md", "lg"],
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "320px" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Storage usage</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					You're using 18.4 GB of your 20 GB plan limit.
				</p>
			</>
		),
	},
};

export const Elevated: Story = {
	args: {
		variant: "elevated",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Invoice INV-2024-0192</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					$249.00 charged to Visa ending in 4242 on Jul 1.
				</p>
			</>
		),
	},
};

export const Outlined: Story = {
	args: {
		variant: "outlined",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Two-factor authentication</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Add an extra layer of security to your account at sign-in.
				</p>
			</>
		),
	},
};

export const Filled: Story = {
	args: {
		variant: "filled",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Upgrade to Pro</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Unlock unlimited campaigns and priority support for $29/mo.
				</p>
			</>
		),
	},
};

// =============================================================================
// PADDING
// =============================================================================

export const SmallPadding: Story = {
	args: {
		padding: "sm",
		children: (
			<p style={{ margin: 0 }}>API request limit reached — resets in 4h.</p>
		),
	},
};

export const LargePadding: Story = {
	args: {
		padding: "lg",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Welcome to the team</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Take a moment to set up your profile and explore the workspace before
					your first sync.
				</p>
			</>
		),
	},
};

// =============================================================================
// INTERACTIVE
// =============================================================================

export const Interactive: Story = {
	args: {
		interactive: true,
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Growth plan</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Select this plan to continue checkout.
				</p>
			</>
		),
	},
};

// =============================================================================
// WITH SUB-COMPONENTS
// =============================================================================

export const WithHeaderAndFooter: Story = {
	args: {
		children: (
			<>
				<CardHeader>
					<h3 style={{ margin: 0 }}>Maya Chen</h3>
				</CardHeader>
				<CardBody>
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						Product Designer · Joined the workspace on Mar 12, 2024.
					</p>
				</CardBody>
				<CardFooter>
					<button
						type="button"
						style={{
							background: "var(--color-primary)",
							color: "white",
							border: "none",
							padding: "0.5rem 1rem",
							borderRadius: "var(--radius-md)",
							cursor: "pointer",
						}}
					>
						View profile
					</button>
				</CardFooter>
			</>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Card variant="elevated">
				<h4 style={{ margin: "0 0 0.5rem" }}>Pro plan</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					$29/mo · Unlimited campaigns
				</p>
			</Card>
			<Card variant="outlined">
				<h4 style={{ margin: "0 0 0.5rem" }}>Starter plan</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					$0/mo · Up to 2 campaigns
				</p>
			</Card>
			<Card variant="filled">
				<h4 style={{ margin: "0 0 0.5rem" }}>Enterprise plan</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Custom pricing · Dedicated support
				</p>
			</Card>
		</div>
	),
};

export const ProfileCard: Story = {
	args: {
		variant: "elevated",
		padding: "lg",
		children: (
			<div style={{ textAlign: "center" }}>
				<div
					style={{
						width: "80px",
						height: "80px",
						borderRadius: "50%",
						background: "var(--color-primary)",
						margin: "0 auto 1rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
						fontSize: "2rem",
					}}
				>
					MC
				</div>
				<h3 style={{ margin: "0 0 0.25rem" }}>Maya Chen</h3>
				<p style={{ margin: "0 0 1rem", color: "var(--color-muted)" }}>
					Product Designer at Northwind
				</p>
				<button
					type="button"
					style={{
						background: "var(--color-primary)",
						color: "white",
						border: "none",
						padding: "0.5rem 1.5rem",
						borderRadius: "var(--radius-md)",
						cursor: "pointer",
						width: "100%",
					}}
				>
					Follow
				</button>
			</div>
		),
	},
};

// =============================================================================
// SPEC — editorial showcase card with serif name + uppercase mono meta
// =============================================================================

export const Spec: Story = {
	args: {
		variant: "spec",
		padding: "none",
		children: (
			<>
				<CardHeader
					name={
						<>
							Tabs <em>and more</em>
						</>
					}
					meta="line · pill · enclosed"
				/>
				<CardBody>
					<p>
						Use the spec variant to wrap a labelled component or content block.
					</p>
				</CardBody>
			</>
		),
	},
};

// =============================================================================
// REAL-WORLD SHOWCASE — billing settings page card grid
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(2, 1fr)",
				gap: "1rem",
				width: "560px",
			}}
		>
			<Card variant="elevated">
				<h4 style={{ margin: "0 0 0.5rem" }}>Current plan</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Growth · $79/mo · renews Aug 14
				</p>
			</Card>
			<Card variant="outlined">
				<h4 style={{ margin: "0 0 0.5rem" }}>Payment method</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					Visa ending in 4242 · expires 09/27
				</p>
			</Card>
			<Card variant="filled">
				<h4 style={{ margin: "0 0 0.5rem" }}>Usage this month</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					8,204 of 10,000 API calls used
				</p>
			</Card>
			<Card variant="outlined" interactive>
				<h4 style={{ margin: "0 0 0.5rem" }}>Next invoice</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					$79.00 due Aug 14 — view details
				</p>
			</Card>
		</div>
	),
};
