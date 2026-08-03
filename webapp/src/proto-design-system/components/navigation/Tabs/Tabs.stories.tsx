import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard, Key, Shield, Users, Webhook } from "lucide-react";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
	title: "Navigation/Tabs",
	component: Tabs,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["line", "enclosed", "pill"],
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
	render: (args) => (
		<Tabs {...args} defaultTab="account">
			<TabList aria-label="Account settings">
				<Tab id="account">Account</Tab>
				<Tab id="security">Security</Tab>
				<Tab id="billing">Billing</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="account">
					<p>Update your name, email address, and profile photo.</p>
				</TabPanel>
				<TabPanel id="security">
					<p>Manage your password, two-factor authentication, and sessions.</p>
				</TabPanel>
				<TabPanel id="billing">
					<p>View invoices and update your payment method.</p>
				</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Line: Story = {
	render: () => (
		<Tabs variant="line" defaultTab="overview">
			<TabList aria-label="Project navigation">
				<Tab id="overview">Overview</Tab>
				<Tab id="deployments">Deployments</Tab>
				<Tab id="analytics">Analytics</Tab>
				<Tab id="settings">Settings</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="overview">
					Project health, recent commits, and activity.
				</TabPanel>
				<TabPanel id="deployments">
					A log of every build and its status.
				</TabPanel>
				<TabPanel id="analytics">
					Traffic, latency, and error rate over time.
				</TabPanel>
				<TabPanel id="settings">
					Environment variables, domains, and teams.
				</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Enclosed: Story = {
	render: () => (
		<Tabs variant="enclosed" defaultTab="profile">
			<TabList aria-label="Workspace settings">
				<Tab id="profile">Profile</Tab>
				<Tab id="billing">Billing</Tab>
				<Tab id="team">Team</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="profile">
					Your display name, avatar, and timezone.
				</TabPanel>
				<TabPanel id="billing">Plan, usage, and payment history.</TabPanel>
				<TabPanel id="team">Invite teammates and manage roles.</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Pill: Story = {
	render: () => (
		<Tabs variant="pill" defaultTab="all">
			<TabList aria-label="Ticket filters">
				<Tab id="all">All</Tab>
				<Tab id="open">Open</Tab>
				<Tab id="in-progress">In progress</Tab>
				<Tab id="resolved">Resolved</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="all">Every ticket across all queues.</TabPanel>
				<TabPanel id="open">Tickets waiting on a first response.</TabPanel>
				<TabPanel id="in-progress">Tickets currently being worked.</TabPanel>
				<TabPanel id="resolved">Tickets closed in the last 30 days.</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const WithIcons: Story = {
	render: () => (
		<Tabs variant="line" defaultTab="team">
			<TabList aria-label="Settings sections">
				<Tab id="team" icon={<Users />}>
					Team
				</Tab>
				<Tab id="api-keys" icon={<Key />}>
					API Keys
				</Tab>
				<Tab id="webhooks" icon={<Webhook />}>
					Webhooks
				</Tab>
				<Tab id="security" icon={<Shield />}>
					Security
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="team">Manage who has access to this workspace.</TabPanel>
				<TabPanel id="api-keys">Generate and revoke API keys.</TabPanel>
				<TabPanel id="webhooks">
					Configure endpoints for outbound events.
				</TabPanel>
				<TabPanel id="security">SSO, session limits, and audit logs.</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const WithDisabled: Story = {
	render: () => (
		<Tabs variant="line" defaultTab="overview">
			<TabList aria-label="Plan sections">
				<Tab id="overview">Overview</Tab>
				<Tab id="advanced-reports" disabled icon={<CreditCard />}>
					Advanced Reports
				</Tab>
				<Tab id="usage">Usage</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="overview">Your current plan and renewal date.</TabPanel>
				<TabPanel id="advanced-reports">
					Upgrade to Pro to unlock advanced reports.
				</TabPanel>
				<TabPanel id="usage">
					Seats, storage, and API calls this month.
				</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<Tabs variant="line" size="sm" defaultTab="daily">
				<TabList aria-label="Small report range">
					<Tab id="daily">Daily</Tab>
					<Tab id="weekly">Weekly</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="daily">Metrics for the last 24 hours.</TabPanel>
					<TabPanel id="weekly">Metrics for the last 7 days.</TabPanel>
				</TabPanels>
			</Tabs>

			<Tabs variant="line" size="md" defaultTab="daily">
				<TabList aria-label="Medium report range">
					<Tab id="daily">Daily</Tab>
					<Tab id="weekly">Weekly</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="daily">Metrics for the last 24 hours.</TabPanel>
					<TabPanel id="weekly">Metrics for the last 7 days.</TabPanel>
				</TabPanels>
			</Tabs>

			<Tabs variant="line" size="lg" defaultTab="daily">
				<TabList aria-label="Large report range">
					<Tab id="daily">Daily</Tab>
					<Tab id="weekly">Weekly</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="daily">Metrics for the last 24 hours.</TabPanel>
					<TabPanel id="weekly">Metrics for the last 7 days.</TabPanel>
				</TabPanels>
			</Tabs>
		</div>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<Tabs variant="enclosed" defaultTab="general">
			<TabList aria-label="Workspace settings">
				<Tab id="general">General</Tab>
				<Tab id="members" icon={<Users />}>
					Members
				</Tab>
				<Tab id="api-keys" icon={<Key />}>
					API Keys
				</Tab>
				<Tab id="billing" icon={<CreditCard />}>
					Billing
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="general">
					<p>Workspace name, URL slug, and default timezone.</p>
				</TabPanel>
				<TabPanel id="members">
					<p>7 members, 2 pending invitations. Owners can manage roles.</p>
				</TabPanel>
				<TabPanel id="api-keys">
					<p>3 active keys. Rotate or revoke keys used by integrations.</p>
				</TabPanel>
				<TabPanel id="billing">
					<p>Growth plan — renews October 12. Next invoice: $249.00.</p>
				</TabPanel>
			</TabPanels>
		</Tabs>
	),
};
