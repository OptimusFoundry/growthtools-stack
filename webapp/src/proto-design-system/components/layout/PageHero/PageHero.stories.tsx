import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { PageHero } from "./PageHero";

const meta: Meta<typeof PageHero> = {
	title: "Layout/PageHero",
	component: PageHero,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		title: "Campaigns",
	},
};

export const WithEyebrow: Story = {
	args: {
		eyebrow: "Campaigns · 04 total",
		title: "Campaigns",
	},
};

export const WithDescription: Story = {
	args: {
		eyebrow: "Campaigns · 04 total",
		title: "Campaigns",
		description:
			"Manage your waitlist campaigns and track signup conversions across all your products.",
	},
};

export const WithActions: Story = {
	args: {
		eyebrow: "Campaigns · 04 total",
		title: "Campaigns",
		description: "Manage your waitlist campaigns.",
		actions: <Button>New Campaign</Button>,
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const TitleWithAccent: Story = {
	args: {
		eyebrow: "Launch · 12 leads",
		title: (
			<>
				Early Access <em>Waitlist</em>
			</>
		),
		description: "Collect and verify leads before your product goes live.",
		actions: <Button>Add Signup Form</Button>,
	},
};

export const MinimalTitle: Story = {
	args: {
		title: "Settings",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const CampaignsPage: Story = {
	render: () => (
		<div
			style={{
				background: "var(--color-base-100)",
				minHeight: "100vh",
				padding: "var(--space-8)",
			}}
		>
			<PageHero
				eyebrow="Campaigns · 04 total"
				title="Campaigns"
				description="Manage your waitlist campaigns and track signup conversions."
				actions={
					<>
						<Button variant="outline">Export</Button>
						<Button>New Campaign</Button>
					</>
				}
			/>
		</div>
	),
};

export const SettingsPage: Story = {
	render: () => (
		<div
			style={{
				background: "var(--color-base-100)",
				minHeight: "100vh",
				padding: "var(--space-8)",
			}}
		>
			<PageHero
				title="Account Settings"
				description="Update your profile, billing, and notification preferences."
			/>
		</div>
	),
};

// =============================================================================
// REAL-WORLD PATTERNS (no new slots — existing props cover all cases)
// =============================================================================

export const GreetingHero: Story = {
	name: "Greeting hero (dashboard)",
	render: () => (
		<div style={{ padding: "var(--space-8)" }}>
			<PageHero
				eyebrow="FREE PLAN"
				title="Good morning, Alex."
				description="You have 2 active campaigns and 147 new leads this week."
			/>
		</div>
	),
};

export const AnalyticsHero: Story = {
	name: "Analytics page (no eyebrow)",
	render: () => (
		<div style={{ padding: "var(--space-8)" }}>
			<PageHero
				title="Analytics"
				description="Track your marketing performance and campaign metrics"
				actions={<Button variant="outline">Export</Button>}
			/>
		</div>
	),
};

export const BillingHero: Story = {
	name: "Billing page (title only)",
	render: () => (
		<div style={{ padding: "var(--space-8)" }}>
			<PageHero title="Billing" />
		</div>
	),
};
