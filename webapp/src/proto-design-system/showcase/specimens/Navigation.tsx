// Navigation specimen — full variant matrices for the navigation components.
// Mirrors specimens/Primitives.tsx: shared <Spec>/<SpecRow>/<SpecItem> framework,
// rows driven off each component's real props (read from its .tsx + .stories.tsx),
// controlled demos (Pagination, Tabs) and the CommandPalette trigger live in small
// inner components with local state, per the framework's pattern.

import {
	BarChart,
	Bell,
	FileText,
	Folder,
	Home,
	Inbox,
	LogOut,
	Plus,
	Search,
	Settings,
	Slash,
	User,
} from "lucide-react";
import { useState } from "react";
import type { BreadcrumbItem } from "../../components/navigation/Breadcrumb/Breadcrumb";
import { Breadcrumb } from "../../components/navigation/Breadcrumb/Breadcrumb";
import type { CommandItem } from "../../components/navigation/CommandPalette/CommandPalette";
import { CommandPalette } from "../../components/navigation/CommandPalette/CommandPalette";
import { Navbar, NavLink } from "../../components/navigation/Navbar/Navbar";
import type {
	PaginationSize,
	PaginationVariant,
} from "../../components/navigation/Pagination/Pagination";
import { Pagination } from "../../components/navigation/Pagination/Pagination";
import {
	Sidebar,
	SidebarDivider,
	SidebarGroup,
	SidebarHeader,
	SidebarItem,
	SidebarLogo,
	SidebarSection,
	SidebarToggle,
} from "../../components/navigation/Sidebar/Sidebar";
import type { StepData } from "../../components/navigation/StepIndicator/StepIndicator";
import { StepIndicator } from "../../components/navigation/StepIndicator/StepIndicator";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "../../components/navigation/Tabs/Tabs";
import { Avatar } from "../../components/primitives/Avatar/Avatar";
import { Badge } from "../../components/primitives/Badge/Badge";
import { Button } from "../../components/primitives/Button/Button";
import { Text } from "../../components/primitives/Text/Text";
import { Spec, SpecItem, SpecRow } from "../Spec";

// =============================================================================
// Shared demo data
// =============================================================================

const breadcrumbItems: BreadcrumbItem[] = [
	{ label: "Home", href: "/" },
	{ label: "Products", href: "/products" },
	{ label: "Electronics", href: "/products/electronics" },
	{ label: "Laptops" },
];

const commandItems: CommandItem[] = [
	{
		id: "home",
		label: "Go to Home",
		icon: <Home />,
		shortcut: ["⌘", "H"],
		group: "Navigation",
	},
	{
		id: "dashboard",
		label: "Go to Dashboard",
		icon: <BarChart />,
		description: "View your analytics",
		group: "Navigation",
	},
	{
		id: "new-doc",
		label: "Create New Document",
		icon: <Plus />,
		shortcut: ["⌘", "N"],
		group: "Actions",
	},
	{
		id: "settings",
		label: "Open Settings",
		icon: <Settings />,
		shortcut: ["⌘", ","],
		group: "Actions",
	},
	{ id: "logout", label: "Log Out", icon: <LogOut />, group: "Account" },
];

const basicSteps: StepData[] = [
	{ id: "1", label: "Account" },
	{ id: "2", label: "Profile" },
	{ id: "3", label: "Settings" },
	{ id: "4", label: "Complete" },
];

const stepsWithDescriptions: StepData[] = [
	{ id: "1", label: "Account", description: "Create your account" },
	{ id: "2", label: "Profile", description: "Add your information" },
	{ id: "3", label: "Settings", description: "Configure preferences" },
	{ id: "4", label: "Complete", description: "Finish setup" },
];

const stepsWithError: StepData[] = [
	{ id: "1", label: "Account", status: "completed" },
	{ id: "2", label: "Profile", status: "completed" },
	{ id: "3", label: "Payment", status: "error" },
	{ id: "4", label: "Complete" },
];

const shippingSteps: StepData[] = [
	{
		id: "1",
		label: "Order Placed",
		description: "Your order has been received",
	},
	{
		id: "2",
		label: "Processing",
		description: "We are preparing your order",
	},
	{ id: "3", label: "Shipped", description: "Your order is on its way" },
	{
		id: "4",
		label: "Delivered",
		description: "Package delivered to your address",
	},
];

// =============================================================================
// Controlled / stateful demo wrappers
// =============================================================================

function CommandPaletteDemo() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				leftIcon={<Search />}
				onClick={() => setIsOpen(true)}
			>
				Open command palette
			</Button>
			<CommandPalette
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				items={commandItems}
			/>
		</>
	);
}

interface PaginationDemoProps {
	initialPage?: number;
	totalPages?: number;
	siblings?: number;
	showFirstLast?: boolean;
	size?: PaginationSize;
	variant?: PaginationVariant;
	disabled?: boolean;
}

function PaginationDemo({
	initialPage = 1,
	totalPages = 10,
	siblings,
	showFirstLast,
	size,
	variant,
	disabled,
}: PaginationDemoProps) {
	const [page, setPage] = useState(initialPage);

	return (
		<Pagination
			page={page}
			totalPages={totalPages}
			onPageChange={setPage}
			siblings={siblings}
			showFirstLast={showFirstLast}
			size={size}
			variant={variant}
			disabled={disabled}
		/>
	);
}

function StepIndicatorDemo() {
	const [currentStep, setCurrentStep] = useState(0);

	return (
		<StepIndicator
			steps={basicSteps}
			currentStep={currentStep}
			onStepClick={(index) => setCurrentStep(index)}
		/>
	);
}

function ControlledTabsDemo() {
	const [activeTab, setActiveTab] = useState("tab1");

	return (
		<Tabs variant="line" activeTab={activeTab} onTabChange={setActiveTab}>
			<TabList aria-label="Controlled tabs">
				<Tab id="tab1">Overview</Tab>
				<Tab id="tab2">Analytics</Tab>
				<Tab id="tab3">Settings</Tab>
			</TabList>
			<TabPanels>
				<TabPanel id="tab1">Overview content.</TabPanel>
				<TabPanel id="tab2">Analytics content.</TabPanel>
				<TabPanel id="tab3">Settings content.</TabPanel>
			</TabPanels>
		</Tabs>
	);
}

export function NavigationSpecimens() {
	return (
		<>
			<Spec
				name="Breadcrumb"
				description="Navigation hierarchy trail in three sizes, with icons, custom separators, and overflow collapsing."
			>
				<SpecRow label="Sizes" column>
					<SpecItem label="sm">
						<Breadcrumb size="sm" items={breadcrumbItems} />
					</SpecItem>
					<SpecItem label="md">
						<Breadcrumb size="md" items={breadcrumbItems} />
					</SpecItem>
					<SpecItem label="lg">
						<Breadcrumb size="lg" items={breadcrumbItems} />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="icons, no home icon">
						<Breadcrumb
							items={[
								{ label: "Documents", href: "/", icon: <Folder /> },
								{ label: "Projects", href: "/projects", icon: <Folder /> },
								{ label: "Design System", icon: <FileText /> },
							]}
							showHomeIcon={false}
						/>
					</SpecItem>
					<SpecItem label="custom separator">
						<Breadcrumb
							items={[
								{ label: "Home", href: "/" },
								{ label: "Library", href: "/library" },
								{ label: "Data" },
							]}
							separator={<Slash />}
						/>
					</SpecItem>
					<SpecItem label="maxItems collapse">
						<Breadcrumb
							items={[
								{ label: "Home", href: "/" },
								{ label: "Products", href: "/products" },
								{ label: "Electronics", href: "/electronics" },
								{ label: "Computers", href: "/computers" },
								{ label: "Laptops", href: "/laptops" },
								{ label: "Gaming Laptops" },
							]}
							maxItems={3}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="CommandPalette"
				description="Keyboard-driven command launcher rendered in a native dialog, with grouped, iconed, and shortcut-labeled commands."
			>
				<SpecRow label="Trigger">
					<SpecItem label="opens via local state" grow>
						<CommandPaletteDemo />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Navbar"
				description="Top-level navigation bar in three visual variants, with brand, link, and action slots."
			>
				<SpecRow label="Variants" column>
					<SpecItem label="default" grow>
						<Navbar
							brand={
								<Text as="span" weight="semibold" size="lg">
									Proto
								</Text>
							}
							actions={
								<>
									<Button variant="ghost" isIconOnly aria-label="Search">
										<Search />
									</Button>
									<Button variant="ghost" isIconOnly aria-label="Notifications">
										<Bell />
									</Button>
									<Button variant="primary" size="sm">
										Sign in
									</Button>
								</>
							}
						>
							<NavLink href="#" active>
								Home
							</NavLink>
							<NavLink href="#">Products</NavLink>
							<NavLink href="#">About</NavLink>
						</Navbar>
					</SpecItem>
					<SpecItem label="transparent" grow>
						<Navbar
							variant="transparent"
							brand={
								<Text as="span" weight="semibold" size="lg">
									Proto
								</Text>
							}
							actions={
								<Button variant="primary" size="sm">
									Sign in
								</Button>
							}
						>
							<NavLink href="#" active>
								Home
							</NavLink>
							<NavLink href="#">Products</NavLink>
						</Navbar>
					</SpecItem>
					<SpecItem label="filled" grow>
						<Navbar
							variant="filled"
							brand={
								<Text as="span" weight="semibold" size="lg">
									Proto
								</Text>
							}
							actions={
								<Button variant="primary" size="sm">
									Sign in
								</Button>
							}
						>
							<NavLink href="#" active>
								Home
							</NavLink>
							<NavLink href="#">Products</NavLink>
						</Navbar>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="with avatar, no brand actions row" grow>
						<Navbar
							brand={
								<Text as="span" weight="semibold" size="lg">
									Proto
								</Text>
							}
							actions={
								<>
									<Button variant="ghost" isIconOnly aria-label="Notifications">
										<Bell />
									</Button>
									<Avatar initials="JD" size="sm" />
								</>
							}
						>
							<NavLink href="#" active>
								Dashboard
							</NavLink>
							<NavLink href="#">Projects</NavLink>
							<NavLink href="#">Team</NavLink>
						</Navbar>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Pagination"
				description="Page navigation with first/last jumps, sibling ranges, and ellipsis collapsing. Each demo owns its own page state."
			>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<PaginationDemo variant="default" />
					</SpecItem>
					<SpecItem label="outline">
						<PaginationDemo variant="outline" />
					</SpecItem>
					<SpecItem label="ghost">
						<PaginationDemo variant="ghost" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<PaginationDemo size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<PaginationDemo size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<PaginationDemo size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="many pages, siblings=2">
						<PaginationDemo initialPage={5} totalPages={20} siblings={2} />
					</SpecItem>
					<SpecItem label="few pages">
						<PaginationDemo totalPages={3} />
					</SpecItem>
					<SpecItem label="no first/last buttons">
						<PaginationDemo showFirstLast={false} />
					</SpecItem>
					<SpecItem label="disabled">
						<PaginationDemo disabled />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Sidebar"
				description="Vertical app navigation with collapsible width, sections, expandable groups, and badges."
			>
				<SpecRow label="Variants" column>
					<SpecItem label="default, with header + toggle" grow>
						<Sidebar>
							<SidebarHeader>
								<SidebarLogo>Acme Inc</SidebarLogo>
								<SidebarToggle />
							</SidebarHeader>
							<SidebarSection>
								<SidebarItem icon={<Home />} href="#" active>
									Dashboard
								</SidebarItem>
								<SidebarItem
									icon={<Inbox />}
									href="#"
									badge={
										<Badge variant="primary" size="sm">
											12
										</Badge>
									}
								>
									Inbox
								</SidebarItem>
								<SidebarItem icon={<FileText />} href="#">
									Documents
								</SidebarItem>
							</SidebarSection>
							<SidebarDivider />
							<SidebarSection title="Team">
								<SidebarItem icon={<BarChart />} href="#">
									Analytics
								</SidebarItem>
								<SidebarItem icon={<Settings />} href="#">
									Settings
								</SidebarItem>
							</SidebarSection>
						</Sidebar>
					</SpecItem>
					<SpecItem label="compact, collapsed" grow>
						<Sidebar variant="compact" collapsed>
							<SidebarSection>
								<SidebarItem icon={<Home />} href="#" active>
									Dashboard
								</SidebarItem>
								<SidebarItem icon={<Inbox />} href="#">
									Inbox
								</SidebarItem>
								<SidebarItem icon={<BarChart />} href="#">
									Analytics
								</SidebarItem>
								<SidebarItem icon={<Settings />} href="#">
									Settings
								</SidebarItem>
							</SidebarSection>
						</Sidebar>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="expandable group, disabled item" grow>
						<Sidebar>
							<SidebarSection>
								<SidebarItem icon={<Home />} href="#" active>
									Dashboard
								</SidebarItem>
								<SidebarGroup
									icon={<Folder />}
									label="Projects"
									defaultExpanded
								>
									<SidebarItem href="#">Project Alpha</SidebarItem>
									<SidebarItem href="#">Project Beta</SidebarItem>
								</SidebarGroup>
								<SidebarItem icon={<BarChart />} href="#" disabled>
									Analytics (Pro)
								</SidebarItem>
							</SidebarSection>
						</Sidebar>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="StepIndicator"
				description="Sequential progress indicator with pending, active, completed, and error states, in horizontal and vertical orientations."
			>
				<SpecRow label="Sizes" column>
					<SpecItem label="sm">
						<StepIndicator steps={basicSteps} currentStep={1} size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<StepIndicator steps={basicSteps} currentStep={1} size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<StepIndicator steps={basicSteps} currentStep={1} size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="with descriptions">
						<StepIndicator steps={stepsWithDescriptions} currentStep={1} />
					</SpecItem>
					<SpecItem label="error status (explicit)">
						<StepIndicator steps={stepsWithError} />
					</SpecItem>
					<SpecItem label="vertical orientation">
						<StepIndicator
							steps={shippingSteps}
							currentStep={2}
							orientation="vertical"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="interactive (clickable steps)" grow>
						<StepIndicatorDemo />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Tabs"
				description="Tabbed navigation with three visual variants, three sizes, icons, disabled tabs, and a controlled mode."
			>
				<SpecRow label="Variants" column>
					<SpecItem label="line">
						<Tabs variant="line" defaultTab="tab1">
							<TabList aria-label="Line tabs">
								<Tab id="tab1">Overview</Tab>
								<Tab id="tab2">Analytics</Tab>
								<Tab id="tab3">Reports</Tab>
							</TabList>
							<TabPanels>
								<TabPanel id="tab1">Overview content.</TabPanel>
								<TabPanel id="tab2">Analytics content.</TabPanel>
								<TabPanel id="tab3">Reports content.</TabPanel>
							</TabPanels>
						</Tabs>
					</SpecItem>
					<SpecItem label="enclosed">
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
					</SpecItem>
					<SpecItem label="pill">
						<Tabs variant="pill" defaultTab="tab1">
							<TabList aria-label="Pill tabs">
								<Tab id="tab1">All</Tab>
								<Tab id="tab2">Active</Tab>
								<Tab id="tab3">Archived</Tab>
							</TabList>
							<TabPanels>
								<TabPanel id="tab1">All items.</TabPanel>
								<TabPanel id="tab2">Active items.</TabPanel>
								<TabPanel id="tab3">Archived items.</TabPanel>
							</TabPanels>
						</Tabs>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes" column>
					<SpecItem label="sm">
						<Tabs variant="line" size="sm" defaultTab="tab1">
							<TabList aria-label="Small tabs">
								<Tab id="tab1">Small</Tab>
								<Tab id="tab2">Tabs</Tab>
							</TabList>
							<TabPanels>
								<TabPanel id="tab1">Small size content.</TabPanel>
								<TabPanel id="tab2">Second tab content.</TabPanel>
							</TabPanels>
						</Tabs>
					</SpecItem>
					<SpecItem label="md">
						<Tabs variant="line" size="md" defaultTab="tab1">
							<TabList aria-label="Medium tabs">
								<Tab id="tab1">Medium</Tab>
								<Tab id="tab2">Tabs</Tab>
							</TabList>
							<TabPanels>
								<TabPanel id="tab1">Medium size content.</TabPanel>
								<TabPanel id="tab2">Second tab content.</TabPanel>
							</TabPanels>
						</Tabs>
					</SpecItem>
					<SpecItem label="lg">
						<Tabs variant="line" size="lg" defaultTab="tab1">
							<TabList aria-label="Large tabs">
								<Tab id="tab1">Large</Tab>
								<Tab id="tab2">Tabs</Tab>
							</TabList>
							<TabPanels>
								<TabPanel id="tab1">Large size content.</TabPanel>
								<TabPanel id="tab2">Second tab content.</TabPanel>
							</TabPanels>
						</Tabs>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="icons">
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
					</SpecItem>
					<SpecItem label="disabled tab">
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
					</SpecItem>
					<SpecItem label="controlled (activeTab + onTabChange)" grow>
						<ControlledTabsDemo />
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
