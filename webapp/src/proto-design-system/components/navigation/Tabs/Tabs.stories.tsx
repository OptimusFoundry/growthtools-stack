import type { Meta, StoryObj } from "@storybook/react";
import { Home, Settings, User } from "lucide-react";
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
		<Tabs {...args} defaultTab="tab1">
			<TabList aria-label="Sample tabs">
				<Tab id="tab1">Account</Tab>
				<Tab id="tab2">Security</Tab>
				<Tab id="tab3">Notifications</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">
					<p>Manage your account settings and preferences.</p>
				</TabPanel>
				<TabPanel id="tab2">
					<p>Update your password and security options.</p>
				</TabPanel>
				<TabPanel id="tab3">
					<p>Configure your notification preferences.</p>
				</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Line: Story = {
	render: () => (
		<Tabs variant="line" defaultTab="tab1">
			<TabList aria-label="Line tabs">
				<Tab id="tab1">Overview</Tab>
				<Tab id="tab2">Analytics</Tab>
				<Tab id="tab3">Reports</Tab>
				<Tab id="tab4">Settings</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">Overview content</TabPanel>
				<TabPanel id="tab2">Analytics content</TabPanel>
				<TabPanel id="tab3">Reports content</TabPanel>
				<TabPanel id="tab4">Settings content</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Enclosed: Story = {
	render: () => (
		<Tabs variant="enclosed" defaultTab="tab1">
			<TabList aria-label="Enclosed tabs">
				<Tab id="tab1">Profile</Tab>
				<Tab id="tab2">Billing</Tab>
				<Tab id="tab3">Team</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">Profile settings and information.</TabPanel>
				<TabPanel id="tab2">Billing and subscription details.</TabPanel>
				<TabPanel id="tab3">Team members and permissions.</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Pill: Story = {
	render: () => (
		<Tabs variant="pill" defaultTab="tab1">
			<TabList aria-label="Pill tabs">
				<Tab id="tab1">All</Tab>
				<Tab id="tab2">Active</Tab>
				<Tab id="tab3">Completed</Tab>
				<Tab id="tab4">Archived</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">All items</TabPanel>
				<TabPanel id="tab2">Active items</TabPanel>
				<TabPanel id="tab3">Completed items</TabPanel>
				<TabPanel id="tab4">Archived items</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const WithIcons: Story = {
	render: () => (
		<Tabs variant="line" defaultTab="tab1">
			<TabList aria-label="Tabs with icons">
				<Tab id="tab1" icon={<Home />}>
					Home
				</Tab>
				<Tab id="tab2" icon={<User />}>
					Profile
				</Tab>
				<Tab id="tab3" icon={<Settings />}>
					Settings
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">Home dashboard content.</TabPanel>
				<TabPanel id="tab2">User profile content.</TabPanel>
				<TabPanel id="tab3">Settings content.</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const WithDisabled: Story = {
	render: () => (
		<Tabs variant="line" defaultTab="tab1">
			<TabList aria-label="Tabs with disabled">
				<Tab id="tab1">Available</Tab>
				<Tab id="tab2" disabled>
					Disabled
				</Tab>
				<Tab id="tab3">Another</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">This tab is available.</TabPanel>
				<TabPanel id="tab2">This tab is disabled.</TabPanel>
				<TabPanel id="tab3">Another available tab.</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<Tabs variant="line" size="sm" defaultTab="tab1">
				<TabList aria-label="Small tabs">
					<Tab id="tab1">Small</Tab>
					<Tab id="tab2">Tabs</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="tab1">Small size content</TabPanel>
					<TabPanel id="tab2">Second tab content</TabPanel>
				</TabPanels>
			</Tabs>

			<Tabs variant="line" size="md" defaultTab="tab1">
				<TabList aria-label="Medium tabs">
					<Tab id="tab1">Medium</Tab>
					<Tab id="tab2">Tabs</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="tab1">Medium size content</TabPanel>
					<TabPanel id="tab2">Second tab content</TabPanel>
				</TabPanels>
			</Tabs>

			<Tabs variant="line" size="lg" defaultTab="tab1">
				<TabList aria-label="Large tabs">
					<Tab id="tab1">Large</Tab>
					<Tab id="tab2">Tabs</Tab>
				</TabList>
				<TabPanels>
					<TabPanel id="tab1">Large size content</TabPanel>
					<TabPanel id="tab2">Second tab content</TabPanel>
				</TabPanels>
			</Tabs>
		</div>
	),
};
