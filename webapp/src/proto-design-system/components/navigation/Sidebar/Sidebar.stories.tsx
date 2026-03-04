import type { Meta, StoryObj } from "@storybook/react";
import {
	BarChart,
	FileText,
	Folder,
	HelpCircle,
	Home,
	Inbox,
	LogOut,
	Settings,
	Users,
} from "lucide-react";
import { useState } from "react";
import {
	Sidebar,
	SidebarDivider,
	SidebarGroup,
	SidebarHeader,
	SidebarItem,
	SidebarLogo,
	SidebarSection,
	SidebarToggle,
} from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
	title: "Navigation/Sidebar",
	component: Sidebar,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					height: "500px",
					background: "var(--color-base-100)",
				}}
			>
				<Story />
				<div style={{ flex: 1, padding: "1rem" }}>Main content area</div>
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
	render: () => (
		<Sidebar>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#" badge="12">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
				<SidebarItem icon={<BarChart />} href="#">
					Analytics
				</SidebarItem>
			</SidebarSection>

			<SidebarSection title="Team">
				<SidebarItem icon={<Users />} href="#">
					Members
				</SidebarItem>
				<SidebarItem icon={<Settings />} href="#">
					Settings
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

export const WithGroups: Story = {
	render: () => (
		<Sidebar>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarGroup icon={<Folder />} label="Projects" defaultExpanded>
					<SidebarItem href="#">Project Alpha</SidebarItem>
					<SidebarItem href="#">Project Beta</SidebarItem>
					<SidebarItem href="#">Project Gamma</SidebarItem>
				</SidebarGroup>
				<SidebarGroup icon={<FileText />} label="Documents">
					<SidebarItem href="#">Reports</SidebarItem>
					<SidebarItem href="#">Presentations</SidebarItem>
				</SidebarGroup>
			</SidebarSection>
		</Sidebar>
	),
};

export const Collapsed: Story = {
	render: () => (
		<Sidebar collapsed>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
				<SidebarItem icon={<BarChart />} href="#">
					Analytics
				</SidebarItem>
				<SidebarItem icon={<Users />} href="#">
					Team
				</SidebarItem>
				<SidebarItem icon={<Settings />} href="#">
					Settings
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

export const Compact: Story = {
	render: () => (
		<Sidebar variant="compact">
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#" badge="5">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
				<SidebarItem icon={<BarChart />} href="#">
					Analytics
				</SidebarItem>
			</SidebarSection>

			<SidebarDivider />

			<SidebarSection title="Account">
				<SidebarItem icon={<Settings />} href="#">
					Settings
				</SidebarItem>
				<SidebarItem icon={<HelpCircle />} href="#">
					Help
				</SidebarItem>
				<SidebarItem icon={<LogOut />} href="#">
					Log out
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

export const WithDividers: Story = {
	render: () => (
		<Sidebar>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Home
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#">
					Inbox
				</SidebarItem>
			</SidebarSection>

			<SidebarDivider />

			<SidebarSection title="Workspace">
				<SidebarItem icon={<Folder />} href="#">
					Projects
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
				<SidebarItem icon={<Users />} href="#">
					Team
				</SidebarItem>
			</SidebarSection>

			<SidebarDivider />

			<SidebarSection>
				<SidebarItem icon={<Settings />} href="#">
					Settings
				</SidebarItem>
				<SidebarItem icon={<LogOut />} href="#">
					Log out
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

export const WithDisabled: Story = {
	render: () => (
		<Sidebar>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<BarChart />} href="#" disabled>
					Analytics (Pro)
				</SidebarItem>
				<SidebarItem icon={<Users />} href="#" disabled>
					Team (Pro)
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

// =============================================================================
// COLLAPSIBLE
// =============================================================================

export const WithToggle: Story = {
	render: () => (
		<Sidebar>
			<SidebarHeader>
				<SidebarLogo>Acme Inc</SidebarLogo>
				<SidebarToggle />
			</SidebarHeader>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#" badge="12">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
				<SidebarItem icon={<BarChart />} href="#">
					Analytics
				</SidebarItem>
			</SidebarSection>

			<SidebarSection title="Team">
				<SidebarItem icon={<Users />} href="#">
					Members
				</SidebarItem>
				<SidebarItem icon={<Settings />} href="#">
					Settings
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

export const Controlled: Story = {
	render: () => {
		const ControlledSidebar = () => {
			const [collapsed, setCollapsed] = useState(false);
			return (
				<Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
					<SidebarHeader>
						<SidebarLogo>Acme Inc</SidebarLogo>
						<SidebarToggle />
					</SidebarHeader>
					<SidebarSection>
						<SidebarItem icon={<Home />} href="#" active>
							Dashboard
						</SidebarItem>
						<SidebarItem icon={<Inbox />} href="#">
							Inbox
						</SidebarItem>
						<SidebarItem icon={<FileText />} href="#">
							Documents
						</SidebarItem>
					</SidebarSection>
				</Sidebar>
			);
		};
		return <ControlledSidebar />;
	},
};

export const Responsive: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Resize the browser window to see the sidebar auto-collapse below 768px and auto-expand above it. The toggle button still works for manual control.",
			},
		},
	},
	render: () => (
		<Sidebar responsive>
			<SidebarHeader>
				<SidebarLogo>Acme Inc</SidebarLogo>
				<SidebarToggle />
			</SidebarHeader>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#" badge="12">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
				<SidebarItem icon={<BarChart />} href="#">
					Analytics
				</SidebarItem>
			</SidebarSection>

			<SidebarDivider />

			<SidebarSection title="Account">
				<SidebarItem icon={<Settings />} href="#">
					Settings
				</SidebarItem>
				<SidebarItem icon={<HelpCircle />} href="#">
					Help
				</SidebarItem>
				<SidebarItem icon={<LogOut />} href="#">
					Log out
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};

export const CustomBreakpoint: Story = {
	parameters: {
		docs: {
			description: {
				story: "Custom breakpoint set to 1024px for tablets.",
			},
		},
	},
	render: () => (
		<Sidebar responsive mobileBreakpoint={1024}>
			<SidebarHeader>
				<SidebarLogo>Wide Breakpoint</SidebarLogo>
				<SidebarToggle />
			</SidebarHeader>
			<SidebarSection>
				<SidebarItem icon={<Home />} href="#" active>
					Dashboard
				</SidebarItem>
				<SidebarItem icon={<Inbox />} href="#">
					Inbox
				</SidebarItem>
				<SidebarItem icon={<FileText />} href="#">
					Documents
				</SidebarItem>
			</SidebarSection>
		</Sidebar>
	),
};
