import type { Meta, StoryObj } from "@storybook/react-vite";
import { Radio } from "./Radio";

const meta: Meta<typeof Radio> = {
	title: "Forms/Radio",
	component: Radio,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		label: "Monthly billing",
		name: "billing-cycle",
	},
};

export const WithDescription: Story = {
	args: {
		label: "Team plan",
		description: "$29/month per seat, billed annually",
		name: "plan-tier",
	},
};

export const Checked: Story = {
	args: {
		label: "US East (N. Virginia)",
		name: "region",
		defaultChecked: true,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Compact layout",
		size: "sm",
		name: "density-sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Comfortable layout",
		size: "md",
		name: "density-md",
	},
};

export const Large: Story = {
	args: {
		label: "Spacious layout",
		size: "lg",
		name: "density-lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Dedicated hosting (upgrade required)",
		disabled: true,
		name: "hosting-disabled",
	},
};

export const DisabledChecked: Story = {
	args: {
		label: "Legacy pricing (locked in)",
		disabled: true,
		defaultChecked: true,
		name: "pricing-locked",
	},
};

export const WithError: Story = {
	args: {
		label: "Accept the data processing agreement",
		isError: true,
		name: "dpa-consent",
	},
};

// =============================================================================
// GROUP
// =============================================================================

export const RadioGroup: Story = {
	render: () => (
		<fieldset style={{ border: "none", padding: 0, margin: 0 }}>
			<legend style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
				Choose a subscription plan
			</legend>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<Radio
					name="subscription-plan"
					value="starter"
					label="Starter"
					description="Up to 3 team members, community support"
				/>
				<Radio
					name="subscription-plan"
					value="growth"
					label="Growth"
					description="$49/month — unlimited members, priority support"
					defaultChecked
				/>
				<Radio
					name="subscription-plan"
					value="enterprise"
					label="Enterprise"
					description="Custom SLA, SSO, and dedicated account manager"
				/>
			</div>
		</fieldset>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Radio name="export-format" value="csv" label="CSV" size="sm" />
			<Radio
				name="export-format"
				value="json"
				label="JSON"
				size="md"
				defaultChecked
			/>
			<Radio name="export-format" value="parquet" label="Parquet" size="lg" />
		</div>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<fieldset style={{ border: "none", padding: 0, margin: 0, width: 320 }}>
			<legend
				style={{
					marginBottom: "var(--space-3)",
					fontWeight: 600,
					fontSize: "var(--font-size-md)",
				}}
			>
				How should we notify you about deploys?
			</legend>
			<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				<Radio
					name="deploy-notifications"
					value="all"
					label="Every deploy"
					description="Slack + email on every push to main"
					defaultChecked
				/>
				<Radio
					name="deploy-notifications"
					value="failures"
					label="Failures only"
					description="Only get pinged when a build breaks"
				/>
				<Radio
					name="deploy-notifications"
					value="none"
					label="Nothing"
					description="You can still check the dashboard anytime"
				/>
				<Radio
					name="deploy-notifications"
					value="pagerduty"
					label="Escalate to PagerDuty (Enterprise only)"
					disabled
				/>
			</div>
		</fieldset>
	),
};
