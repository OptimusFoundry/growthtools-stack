import type { Meta, StoryObj } from "@storybook/react";
import {
	ArrowUpRight,
	BarChart3,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Code,
	CreditCard,
	DollarSign,
	FileText,
	Folder,
	Grid3X3,
	HelpCircle,
	Home,
	Layers,
	LayoutGrid,
	List,
	LogOut,
	Mail,
	Megaphone,
	Moon,
	MoreVertical,
	Plus,
	Search,
	Settings,
	Share2,
	ShieldCheck,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	BannerCenterProvider,
	useBannerCenter,
} from "../feedback/BannerCenter";
import {
	Sidebar,
	SidebarDivider,
	SidebarHeader,
	SidebarItem,
	SidebarLogo,
	SidebarMobileTrigger,
	SidebarProvider,
	SidebarSection,
	SidebarToggle,
	useSidebarContext,
} from "../navigation/Sidebar";
import { Tab, TabList, Tabs } from "../navigation/Tabs";
import { Dropdown } from "../overlays/Dropdown";
import { Avatar } from "../primitives/Avatar";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Card, CardBody, CardFooter, CardHeader } from "./Card";
import { Container } from "./Container";
import { Grid } from "./Grid";
import showcaseStyles from "./LayoutShowcase.module.scss";
import { Stack } from "./Stack";

const meta: Meta = {
	title: "Layout/Showcase",
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// CARD VARIANTS COMPARISON
// =============================================================================

export const CardVariants: Story = {
	render: () => (
		<Container size="xl" style={{ padding: "var(--space-8)" }}>
			<Stack gap="xl">
				<div>
					<h2 style={{ margin: "0 0 var(--space-2)" }}>Card Variants</h2>
					<p style={{ color: "var(--color-muted)", margin: 0 }}>
						Three card styles for different visual hierarchies
					</p>
				</div>

				<Grid columns="3" gap="lg">
					<Card variant="elevated" padding="lg">
						<Stack gap="sm">
							<h3 style={{ margin: 0 }}>Elevated</h3>
							<p style={{ color: "var(--color-muted)", margin: 0 }}>
								Shadow-based depth. Best for primary content that needs
								emphasis.
							</p>
						</Stack>
					</Card>

					<Card variant="outlined" padding="lg">
						<Stack gap="sm">
							<h3 style={{ margin: 0 }}>Outlined</h3>
							<p style={{ color: "var(--color-muted)", margin: 0 }}>
								Border-based separation. Versatile default for most use cases.
							</p>
						</Stack>
					</Card>

					<Card variant="filled" padding="lg">
						<Stack gap="sm">
							<h3 style={{ margin: 0 }}>Filled</h3>
							<p style={{ color: "var(--color-muted)", margin: 0 }}>
								Background-based grouping. Subtle, works well nested.
							</p>
						</Stack>
					</Card>
				</Grid>
			</Stack>
		</Container>
	),
};

// =============================================================================
// DASHBOARD LAYOUT
// =============================================================================

const StatCard = ({
	title,
	value,
	change,
	icon: Icon,
	variant = "outlined",
}: {
	title: string;
	value: string;
	change: string;
	icon: typeof DollarSign;
	variant?: "elevated" | "outlined" | "filled";
}) => (
	<Card variant={variant} padding="lg">
		<Stack gap="md">
			<Stack direction="row" justify="between" align="start">
				<span
					style={{
						color: "var(--color-muted)",
						fontSize: "var(--font-size-sm)",
					}}
				>
					{title}
				</span>
				<div
					style={{
						padding: "var(--space-2)",
						borderRadius: "var(--radius-md)",
						backgroundColor: "var(--color-base-100)",
					}}
				>
					<Icon size={16} />
				</div>
			</Stack>
			<div>
				<div style={{ fontSize: "var(--font-size-2xl)", fontWeight: 600 }}>
					{value}
				</div>
				<div
					style={{
						fontSize: "var(--font-size-xs)",
						color: "var(--color-success)",
						display: "flex",
						alignItems: "center",
						gap: "var(--space-1)",
					}}
				>
					<TrendingUp size={12} />
					{change}
				</div>
			</div>
		</Stack>
	</Card>
);

export const DashboardWithOutlinedCards: Story = {
	render: () => (
		<div
			style={{ backgroundColor: "var(--color-base-50)", minHeight: "100vh" }}
		>
			<Container size="xl" style={{ padding: "var(--space-8)" }}>
				<Stack gap="xl">
					<div>
						<h1 style={{ margin: "0 0 var(--space-1)" }}>Dashboard</h1>
						<p style={{ color: "var(--color-muted)", margin: 0 }}>
							Welcome back! Here's what's happening.
						</p>
					</div>

					<Grid columns="4" gap="lg">
						<StatCard
							title="Total Revenue"
							value="$45,231.89"
							change="+20.1% from last month"
							icon={DollarSign}
						/>
						<StatCard
							title="Subscriptions"
							value="+2,350"
							change="+180.1% from last month"
							icon={Users}
						/>
						<StatCard
							title="Sales"
							value="+12,234"
							change="+19% from last month"
							icon={CreditCard}
						/>
						<StatCard
							title="Active Now"
							value="+573"
							change="+201 since last hour"
							icon={BarChart3}
						/>
					</Grid>

					<Grid columns="2" gap="lg">
						<Card variant="outlined" padding="none">
							<CardHeader>
								<Stack direction="row" justify="between" align="center">
									<h3 style={{ margin: 0 }}>Overview</h3>
									<Button variant="outline" size="sm">
										Download
									</Button>
								</Stack>
							</CardHeader>
							<CardBody>
								<div
									style={{
										height: "300px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--color-muted)",
									}}
								>
									Chart placeholder
								</div>
							</CardBody>
						</Card>

						<Card variant="outlined" padding="none">
							<CardHeader>
								<Stack direction="row" justify="between" align="center">
									<h3 style={{ margin: 0 }}>Recent Sales</h3>
									<Button variant="ghost" size="sm">
										View all
									</Button>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="md">
									{[
										{
											name: "Olivia Martin",
											email: "olivia@email.com",
											amount: "+$1,999.00",
										},
										{
											name: "Jackson Lee",
											email: "jackson@email.com",
											amount: "+$39.00",
										},
										{
											name: "Isabella Nguyen",
											email: "isabella@email.com",
											amount: "+$299.00",
										},
										{
											name: "William Kim",
											email: "will@email.com",
											amount: "+$99.00",
										},
									].map((sale) => (
										<Stack
											key={sale.email}
											direction="row"
											justify="between"
											align="center"
										>
											<Stack gap="xs">
												<span style={{ fontWeight: 500 }}>{sale.name}</span>
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													{sale.email}
												</span>
											</Stack>
											<span style={{ fontWeight: 600 }}>{sale.amount}</span>
										</Stack>
									))}
								</Stack>
							</CardBody>
						</Card>
					</Grid>
				</Stack>
			</Container>
		</div>
	),
};

export const DashboardWithFilledCards: Story = {
	render: () => (
		<div
			style={{ backgroundColor: "var(--color-surface)", minHeight: "100vh" }}
		>
			<Container size="xl" style={{ padding: "var(--space-8)" }}>
				<Stack gap="xl">
					<div>
						<h1 style={{ margin: "0 0 var(--space-1)" }}>Dashboard</h1>
						<p style={{ color: "var(--color-muted)", margin: 0 }}>
							Using filled cards for a softer look.
						</p>
					</div>

					<Grid columns="4" gap="lg">
						<StatCard
							title="Total Revenue"
							value="$45,231.89"
							change="+20.1% from last month"
							icon={DollarSign}
							variant="filled"
						/>
						<StatCard
							title="Subscriptions"
							value="+2,350"
							change="+180.1% from last month"
							icon={Users}
							variant="filled"
						/>
						<StatCard
							title="Sales"
							value="+12,234"
							change="+19% from last month"
							icon={CreditCard}
							variant="filled"
						/>
						<StatCard
							title="Active Now"
							value="+573"
							change="+201 since last hour"
							icon={BarChart3}
							variant="filled"
						/>
					</Grid>
				</Stack>
			</Container>
		</div>
	),
};

export const DashboardWithElevatedCards: Story = {
	render: () => (
		<div
			style={{ backgroundColor: "var(--color-base-100)", minHeight: "100vh" }}
		>
			<Container size="xl" style={{ padding: "var(--space-8)" }}>
				<Stack gap="xl">
					<div>
						<h1 style={{ margin: "0 0 var(--space-1)" }}>Dashboard</h1>
						<p style={{ color: "var(--color-muted)", margin: 0 }}>
							Using elevated cards for prominent depth.
						</p>
					</div>

					<Grid columns="4" gap="lg">
						<StatCard
							title="Total Revenue"
							value="$45,231.89"
							change="+20.1% from last month"
							icon={DollarSign}
							variant="elevated"
						/>
						<StatCard
							title="Subscriptions"
							value="+2,350"
							change="+180.1% from last month"
							icon={Users}
							variant="elevated"
						/>
						<StatCard
							title="Sales"
							value="+12,234"
							change="+19% from last month"
							icon={CreditCard}
							variant="elevated"
						/>
						<StatCard
							title="Active Now"
							value="+573"
							change="+201 since last hour"
							icon={BarChart3}
							variant="elevated"
						/>
					</Grid>
				</Stack>
			</Container>
		</div>
	),
};

// =============================================================================
// MIXED CARD LAYOUTS
// =============================================================================

export const MixedCardHierarchy: Story = {
	render: () => (
		<Container size="xl" style={{ padding: "var(--space-8)" }}>
			<Stack gap="xl">
				<div>
					<h2 style={{ margin: "0 0 var(--space-2)" }}>Mixed Card Hierarchy</h2>
					<p style={{ color: "var(--color-muted)", margin: 0 }}>
						Combine card variants to create visual hierarchy
					</p>
				</div>

				<Grid columns="3" gap="lg">
					{/* Primary/Featured card - elevated */}
					<Card
						variant="elevated"
						padding="lg"
						style={{ gridColumn: "span 2" }}
					>
						<Stack gap="md">
							<Badge>Featured</Badge>
							<h3 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>
								Primary Content Area
							</h3>
							<p style={{ color: "var(--color-muted)", margin: 0 }}>
								Use elevated cards for your most important content. The shadow
								provides visual prominence and draws the user's attention first.
							</p>
							<Stack direction="row" gap="sm">
								<Button>Get Started</Button>
								<Button variant="outline">Learn More</Button>
							</Stack>
						</Stack>
					</Card>

					{/* Secondary cards - outlined */}
					<Stack gap="lg">
						<Card variant="outlined" padding="md">
							<Stack gap="sm">
								<h4 style={{ margin: 0 }}>Quick Stats</h4>
								<div
									style={{ fontSize: "var(--font-size-2xl)", fontWeight: 600 }}
								>
									2,847
								</div>
								<span
									style={{
										color: "var(--color-muted)",
										fontSize: "var(--font-size-sm)",
									}}
								>
									Active users today
								</span>
							</Stack>
						</Card>
						<Card variant="outlined" padding="md">
							<Stack gap="sm">
								<h4 style={{ margin: 0 }}>Conversion</h4>
								<div
									style={{ fontSize: "var(--font-size-2xl)", fontWeight: 600 }}
								>
									12.5%
								</div>
								<span
									style={{
										color: "var(--color-muted)",
										fontSize: "var(--font-size-sm)",
									}}
								>
									+2.3% from last week
								</span>
							</Stack>
						</Card>
					</Stack>
				</Grid>

				{/* Nested filled cards inside outlined */}
				<Card variant="outlined" padding="lg">
					<Stack gap="md">
						<h3 style={{ margin: 0 }}>Nested Cards</h3>
						<p style={{ color: "var(--color-muted)", margin: 0 }}>
							Use filled cards inside outlined cards for grouping related items
						</p>
						<Grid columns="3" gap="md">
							<Card variant="filled" padding="md">
								<Stack direction="row" gap="sm" align="center">
									<Home size={20} />
									<span>Home</span>
								</Stack>
							</Card>
							<Card variant="filled" padding="md">
								<Stack direction="row" gap="sm" align="center">
									<Users size={20} />
									<span>Team</span>
								</Stack>
							</Card>
							<Card variant="filled" padding="md">
								<Stack direction="row" gap="sm" align="center">
									<Settings size={20} />
									<span>Settings</span>
								</Stack>
							</Card>
						</Grid>
					</Stack>
				</Card>
			</Stack>
		</Container>
	),
};

// =============================================================================
// SETTINGS/FORM LAYOUT
// =============================================================================

export const SettingsLayout: Story = {
	render: () => (
		<Container size="lg" style={{ padding: "var(--space-8)" }}>
			<Stack gap="xl">
				<div>
					<h1 style={{ margin: "0 0 var(--space-1)" }}>Settings</h1>
					<p style={{ color: "var(--color-muted)", margin: 0 }}>
						Manage your account settings and preferences.
					</p>
				</div>

				<Stack gap="lg">
					<Card variant="outlined" padding="none">
						<CardHeader>
							<h3 style={{ margin: 0 }}>Profile</h3>
						</CardHeader>
						<CardBody>
							<Stack gap="md">
								<Stack gap="sm">
									<label
										style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}
									>
										Display Name
									</label>
									<input
										type="text"
										defaultValue="John Doe"
										style={{
											padding: "var(--space-2) var(--space-3)",
											border: "1px solid var(--color-border)",
											borderRadius: "var(--radius-md)",
											background: "var(--color-surface)",
										}}
									/>
								</Stack>
								<Stack gap="sm">
									<label
										style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}
									>
										Email
									</label>
									<input
										type="email"
										defaultValue="john@example.com"
										style={{
											padding: "var(--space-2) var(--space-3)",
											border: "1px solid var(--color-border)",
											borderRadius: "var(--radius-md)",
											background: "var(--color-surface)",
										}}
									/>
								</Stack>
							</Stack>
						</CardBody>
						<CardFooter>
							<Stack direction="row" justify="end" gap="sm">
								<Button variant="outline">Cancel</Button>
								<Button>Save Changes</Button>
							</Stack>
						</CardFooter>
					</Card>

					<Card variant="outlined" padding="none">
						<CardHeader>
							<h3 style={{ margin: 0 }}>Notifications</h3>
						</CardHeader>
						<CardBody>
							<Stack gap="md">
								{[
									{
										label: "Email notifications",
										description: "Receive emails about your account activity",
									},
									{
										label: "Push notifications",
										description: "Receive push notifications on your device",
									},
									{
										label: "Weekly digest",
										description: "Receive a weekly summary of your activity",
									},
								].map((item) => (
									<Stack
										key={item.label}
										direction="row"
										justify="between"
										align="center"
									>
										<Stack gap="0">
											<span style={{ fontWeight: 500 }}>{item.label}</span>
											<span
												style={{
													color: "var(--color-muted)",
													fontSize: "var(--font-size-sm)",
												}}
											>
												{item.description}
											</span>
										</Stack>
										<input type="checkbox" defaultChecked />
									</Stack>
								))}
							</Stack>
						</CardBody>
					</Card>

					<Card variant="filled" padding="lg">
						<Stack
							direction="row"
							justify="between"
							align="center"
							wrap
							gap="md"
						>
							<Stack gap="xs" style={{ flex: "1 1 200px", minWidth: 0 }}>
								<h3 style={{ margin: 0, color: "var(--color-error)" }}>
									Danger Zone
								</h3>
								<p
									style={{
										color: "var(--color-muted)",
										margin: 0,
										fontSize: "var(--font-size-sm)",
									}}
								>
									Permanently delete your account and all associated data.
								</p>
							</Stack>
							<Button variant="destructive" style={{ flexShrink: 0 }}>
								Delete Account
							</Button>
						</Stack>
					</Card>
				</Stack>
			</Stack>
		</Container>
	),
};

// =============================================================================
// NO CARDS - CLEAN LAYOUT
// =============================================================================

export const CleanLayoutNoCards: Story = {
	render: () => (
		<Container size="lg" style={{ padding: "var(--space-8)" }}>
			<Stack gap="2xl">
				<div style={{ textAlign: "center" }}>
					<h1 style={{ margin: "0 0 var(--space-2)" }}>
						Build faster with our design system
					</h1>
					<p
						style={{
							color: "var(--color-muted)",
							margin: "0 auto",
							maxWidth: "600px",
							fontSize: "var(--font-size-lg)",
						}}
					>
						A collection of reusable components and patterns that help you build
						consistent user interfaces.
					</p>
				</div>

				<Stack direction="row" justify="center" gap="md">
					<Button size="lg">Get Started</Button>
					<Button variant="outline" size="lg">
						View Docs
						<ArrowUpRight size={16} />
					</Button>
				</Stack>

				<div
					style={{
						borderTop: "1px solid var(--color-border)",
						paddingTop: "var(--space-10)",
					}}
				>
					<Grid columns="3" gap="xl">
						{[
							{
								title: "Component Library",
								description:
									"50+ production-ready components built with accessibility in mind.",
							},
							{
								title: "Design Tokens",
								description:
									"Consistent spacing, colors, and typography through CSS variables.",
							},
							{
								title: "Dark Mode",
								description:
									"Built-in support for light, dark, and custom themes.",
							},
						].map((feature) => (
							<Stack key={feature.title} gap="sm">
								<h3 style={{ margin: 0 }}>{feature.title}</h3>
								<p style={{ color: "var(--color-muted)", margin: 0 }}>
									{feature.description}
								</p>
							</Stack>
						))}
					</Grid>
				</div>
			</Stack>
		</Container>
	),
};

// =============================================================================
// INTERACTIVE CARDS
// =============================================================================

export const InteractiveCards: Story = {
	render: () => (
		<Container size="xl" style={{ padding: "var(--space-8)" }}>
			<Stack gap="xl">
				<div>
					<h2 style={{ margin: "0 0 var(--space-2)" }}>Interactive Cards</h2>
					<p style={{ color: "var(--color-muted)", margin: 0 }}>
						Cards that respond to hover and click for navigation or selection
					</p>
				</div>

				<Grid columns="3" gap="lg">
					{[
						{
							title: "Documentation",
							description: "Learn how to integrate and use our components",
							icon: "📚",
						},
						{
							title: "Components",
							description: "Explore our library of 50+ components",
							icon: "🧩",
						},
						{
							title: "Examples",
							description: "See real-world implementations and patterns",
							icon: "💡",
						},
						{
							title: "Themes",
							description: "Customize colors, typography, and more",
							icon: "🎨",
						},
						{
							title: "Accessibility",
							description: "Built with WCAG guidelines in mind",
							icon: "♿",
						},
						{
							title: "Support",
							description: "Get help from our community and team",
							icon: "💬",
						},
					].map((item) => (
						<Card
							key={item.title}
							variant="outlined"
							padding="lg"
							interactive
							onClick={() => alert(`Clicked: ${item.title}`)}
						>
							<Stack gap="sm">
								<span style={{ fontSize: "var(--font-size-2xl)" }}>
									{item.icon}
								</span>
								<h3 style={{ margin: 0 }}>{item.title}</h3>
								<p style={{ color: "var(--color-muted)", margin: 0 }}>
									{item.description}
								</p>
							</Stack>
						</Card>
					))}
				</Grid>
			</Stack>
		</Container>
	),
};

// =============================================================================
// CAMPAIGNS PAGE RE-IMAGINED
// =============================================================================

const campaigns = [
	{
		id: 1,
		name: "Product Launch 2026",
		description: "Launching camp.xyz",
		status: "draft" as const,
		signups: 181,
		referrals: 29,
		kFactor: 0.2,
		createdAt: "Dec 20, 2025",
	},
	{
		id: 2,
		name: "Launch 2026",
		description: null,
		status: "completed" as const,
		signups: 6,
		referrals: 0,
		kFactor: 0.0,
		createdAt: "Nov 9, 2025",
	},
	{
		id: 3,
		name: "Summer Sale Campaign",
		description: "Seasonal promotion drive",
		status: "active" as const,
		signups: 432,
		referrals: 87,
		kFactor: 0.8,
		createdAt: "Oct 15, 2025",
	},
	{
		id: 4,
		name: "Beta Testers Invite",
		description: "Early access program",
		status: "paused" as const,
		signups: 56,
		referrals: 12,
		kFactor: 0.3,
		createdAt: "Sep 1, 2025",
	},
];

const statusColors = {
	draft: "warning",
	active: "success",
	paused: "default",
	completed: "success",
} as const;

const CampaignCard = ({
	campaign,
	variant = "outlined",
}: {
	campaign: (typeof campaigns)[0];
	variant?: "outlined" | "filled" | "elevated";
}) => (
	<Card variant={variant} padding="none" interactive>
		<CardBody>
			<Stack gap="md">
				{/* Header */}
				<Stack direction="row" justify="between" align="start">
					<Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
						<h3
							style={{
								margin: 0,
								fontSize: "var(--font-size-base)",
								fontWeight: 600,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{campaign.name}
						</h3>
						{campaign.description && (
							<p
								style={{
									margin: 0,
									color: "var(--color-muted)",
									fontSize: "var(--font-size-sm)",
								}}
							>
								{campaign.description}
							</p>
						)}
					</Stack>
					<Stack direction="row" gap="sm" align="center">
						<Badge variant={statusColors[campaign.status]}>
							{campaign.status.charAt(0).toUpperCase() +
								campaign.status.slice(1)}
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							style={{ padding: "var(--space-1)" }}
						>
							<MoreVertical size={16} />
						</Button>
					</Stack>
				</Stack>

				{/* Metrics */}
				<Stack direction="row" gap="lg">
					<Stack gap="0">
						<Stack direction="row" gap="sm" align="center">
							<Users size={14} style={{ color: "var(--color-muted)" }} />
							<span style={{ fontWeight: 600 }}>{campaign.signups}</span>
						</Stack>
						<span
							style={{
								color: "var(--color-muted)",
								fontSize: "var(--font-size-xs)",
							}}
						>
							Signups
						</span>
					</Stack>
					<Stack gap="0">
						<Stack direction="row" gap="sm" align="center">
							<Share2 size={14} style={{ color: "var(--color-muted)" }} />
							<span style={{ fontWeight: 600 }}>{campaign.referrals}</span>
						</Stack>
						<span
							style={{
								color: "var(--color-muted)",
								fontSize: "var(--font-size-xs)",
							}}
						>
							Referrals
						</span>
					</Stack>
					<Stack gap="0">
						<Stack direction="row" gap="sm" align="center">
							<TrendingUp size={14} style={{ color: "var(--color-muted)" }} />
							<span style={{ fontWeight: 600 }}>{campaign.kFactor}</span>
						</Stack>
						<span
							style={{
								color: "var(--color-muted)",
								fontSize: "var(--font-size-xs)",
							}}
						>
							K-Factor
						</span>
					</Stack>
				</Stack>

				{/* Footer */}
				<Stack
					direction="row"
					gap="sm"
					align="center"
					style={{ color: "var(--color-muted)" }}
				>
					<Calendar size={12} />
					<span style={{ fontSize: "var(--font-size-xs)" }}>
						Created {campaign.createdAt}
					</span>
				</Stack>
			</Stack>
		</CardBody>
	</Card>
);

export const CampaignsPage: Story = {
	render: () => {
		const CampaignsDemo = () => {
			const [view, setView] = useState<"grid" | "list">("grid");
			const [activeTab, setActiveTab] = useState("all");

			return (
				<div
					style={{
						backgroundColor: "var(--color-base-50)",
						minHeight: "100vh",
					}}
				>
					<Container size="xl" style={{ padding: "var(--space-8)" }}>
						<Stack gap="lg">
							{/* Page Header */}
							<Stack direction="row" justify="between" align="start">
								<Stack gap="xs">
									<h1 style={{ margin: 0 }}>Campaigns</h1>
									<p style={{ color: "var(--color-muted)", margin: 0 }}>
										Manage your marketing campaigns and promotional activities
									</p>
								</Stack>
								<Button>
									<Plus size={16} />
									Create Campaign
								</Button>
							</Stack>

							{/* Filters Row */}
							<Stack direction="row" justify="between" align="center" gap="md">
								<Stack
									direction="row"
									gap="md"
									align="center"
									style={{ flex: 1 }}
								>
									{/* Search */}
									<div style={{ position: "relative", width: "280px" }}>
										<Search
											size={16}
											style={{
												position: "absolute",
												left: "var(--space-3)",
												top: "50%",
												transform: "translateY(-50%)",
												color: "var(--color-muted)",
											}}
										/>
										<input
											type="text"
											placeholder="Search campaigns..."
											style={{
												width: "100%",
												padding:
													"var(--space-2) var(--space-3) var(--space-2) var(--space-9)",
												border: "1px solid var(--color-border)",
												borderRadius: "var(--radius-md)",
												background: "var(--color-surface)",
												fontSize: "var(--font-size-sm)",
											}}
										/>
									</div>

									{/* Tabs */}
									<Tabs activeTab={activeTab} onTabChange={setActiveTab}>
										<TabList>
											<Tab id="all">All</Tab>
											<Tab id="active">Active</Tab>
											<Tab id="draft">Draft</Tab>
											<Tab id="paused">Paused</Tab>
											<Tab id="completed">Completed</Tab>
										</TabList>
									</Tabs>
								</Stack>

								{/* View Toggle */}
								<Stack direction="row" gap="xs">
									<Button
										variant={view === "grid" ? "secondary" : "ghost"}
										size="sm"
										onClick={() => setView("grid")}
										aria-label="Grid view"
									>
										<Grid3X3 size={16} />
									</Button>
									<Button
										variant={view === "list" ? "secondary" : "ghost"}
										size="sm"
										onClick={() => setView("list")}
										aria-label="List view"
									>
										<List size={16} />
									</Button>
								</Stack>
							</Stack>

							{/* Count */}
							<p
								style={{
									color: "var(--color-muted)",
									margin: 0,
									fontSize: "var(--font-size-sm)",
								}}
							>
								{campaigns.length} campaigns
							</p>

							{/* Campaign Grid */}
							<Grid columns={view === "grid" ? "3" : "1"} gap="md">
								{campaigns.map((campaign) => (
									<CampaignCard key={campaign.id} campaign={campaign} />
								))}
							</Grid>
						</Stack>
					</Container>
				</div>
			);
		};

		return <CampaignsDemo />;
	},
};

export const CampaignsPageFilled: Story = {
	name: "Campaigns Page (Filled Cards)",
	render: () => (
		<div
			style={{ backgroundColor: "var(--color-surface)", minHeight: "100vh" }}
		>
			<Container size="xl" style={{ padding: "var(--space-8)" }}>
				<Stack gap="lg">
					{/* Page Header */}
					<Stack direction="row" justify="between" align="start">
						<Stack gap="xs">
							<h1 style={{ margin: 0 }}>Campaigns</h1>
							<p style={{ color: "var(--color-muted)", margin: 0 }}>
								Using filled cards for a softer appearance
							</p>
						</Stack>
						<Button>
							<Plus size={16} />
							Create Campaign
						</Button>
					</Stack>

					{/* Campaign Grid */}
					<Grid columns="3" gap="md">
						{campaigns.map((campaign) => (
							<CampaignCard
								key={campaign.id}
								campaign={campaign}
								variant="filled"
							/>
						))}
					</Grid>
				</Stack>
			</Container>
		</div>
	),
};

export const CampaignsPageElevated: Story = {
	name: "Campaigns Page (Elevated Cards)",
	render: () => (
		<div
			style={{ backgroundColor: "var(--color-base-100)", minHeight: "100vh" }}
		>
			<Container size="xl" style={{ padding: "var(--space-8)" }}>
				<Stack gap="lg">
					{/* Page Header */}
					<Stack direction="row" justify="between" align="start">
						<Stack gap="xs">
							<h1 style={{ margin: 0 }}>Campaigns</h1>
							<p style={{ color: "var(--color-muted)", margin: 0 }}>
								Using elevated cards for prominent depth
							</p>
						</Stack>
						<Button>
							<Plus size={16} />
							Create Campaign
						</Button>
					</Stack>

					{/* Campaign Grid */}
					<Grid columns="3" gap="md">
						{campaigns.map((campaign) => (
							<CampaignCard
								key={campaign.id}
								campaign={campaign}
								variant="elevated"
							/>
						))}
					</Grid>
				</Stack>
			</Container>
		</div>
	),
};

// =============================================================================
// CAMPAIGN DETAIL PAGE RE-IMAGINED
// =============================================================================

const ChecklistItem = ({
	title,
	description,
	completed,
	required,
}: {
	title: string;
	description: string;
	completed: boolean;
	required?: boolean;
}) => (
	<Card variant="filled" padding="md" interactive>
		<Stack direction="row" justify="between" align="center">
			<Stack direction="row" gap="sm" align="center">
				<div
					style={{
						width: "24px",
						height: "24px",
						borderRadius: "50%",
						backgroundColor: completed
							? "var(--color-success)"
							: "var(--color-base-200)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{completed && (
						<Check
							size={14}
							style={{ color: "var(--color-success-content)" }}
						/>
					)}
				</div>
				<Stack gap="0">
					<span style={{ fontWeight: 500 }}>{title}</span>
					<span
						style={{
							color: "var(--color-muted)",
							fontSize: "var(--font-size-sm)",
						}}
					>
						{description}
					</span>
				</Stack>
			</Stack>
			<Stack direction="row" gap="sm" align="center">
				{required && (
					<Badge variant="warning" size="sm">
						Required
					</Badge>
				)}
				<ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
			</Stack>
		</Stack>
	</Card>
);

const ConfigCard = ({
	icon: Icon,
	title,
	children,
}: {
	icon: typeof Mail;
	title: string;
	children: React.ReactNode;
}) => (
	<Card variant="outlined" padding="md">
		<Stack gap="sm">
			<Stack direction="row" gap="sm" align="center">
				<Icon size={16} style={{ color: "var(--color-muted)" }} />
				<span style={{ fontWeight: 500 }}>{title}</span>
			</Stack>
			{children}
		</Stack>
	</Card>
);

export const CampaignDetailPage: Story = {
	render: () => {
		const CampaignDetailDemo = () => {
			const [activeTab, setActiveTab] = useState("overview");

			return (
				<div
					style={{
						backgroundColor: "var(--color-base-50)",
						minHeight: "100vh",
					}}
				>
					<Container size="xl" style={{ padding: "var(--space-8)" }}>
						<Stack gap="lg">
							{/* Breadcrumb */}
							<Stack
								direction="row"
								gap="sm"
								align="center"
								style={{ color: "var(--color-muted)" }}
							>
								<span style={{ fontSize: "var(--font-size-sm)" }}>
									Campaigns
								</span>
								<ChevronRight size={14} />
								<span
									style={{
										fontSize: "var(--font-size-sm)",
										color: "var(--color-base-content)",
									}}
								>
									Product Launch 2026
								</span>
							</Stack>

							{/* Page Header */}
							<Stack direction="row" justify="between" align="start">
								<Stack gap="xs">
									<Stack direction="row" gap="sm" align="center">
										<h1 style={{ margin: 0 }}>Product Launch 2026</h1>
										<Badge variant="warning">Draft</Badge>
									</Stack>
									<p style={{ color: "var(--color-muted)", margin: 0 }}>
										Launching camp.xyz
									</p>
								</Stack>
								<Stack direction="row" gap="sm">
									<Button variant="outline">Preview</Button>
									<Button>Go Live</Button>
								</Stack>
							</Stack>

							{/* Tabs */}
							<Tabs
								activeTab={activeTab}
								onTabChange={setActiveTab}
								variant="line"
							>
								<TabList>
									<Tab id="overview" icon={<LayoutGrid size={16} />}>
										Overview
									</Tab>
									<Tab id="leads" icon={<Users size={16} />}>
										Leads
									</Tab>
									<Tab id="analytics" icon={<BarChart3 size={16} />}>
										Analytics
									</Tab>
									<Tab id="form" icon={<FileText size={16} />}>
										Form
									</Tab>
									<Tab id="embed" icon={<Code size={16} />}>
										Embed
									</Tab>
									<Tab id="settings" icon={<Settings size={16} />}>
										Settings
									</Tab>
								</TabList>
							</Tabs>

							{/* Overview Content */}
							<Stack gap="xl">
								{/* Launch Checklist */}
								<Stack gap="md">
									<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
										Launch Checklist
									</h2>
									<Stack gap="sm">
										<ChecklistItem
											title="Configure signup form"
											description="1 field configured"
											completed={true}
											required
										/>
										<ChecklistItem
											title="Set up email templates"
											description="Email templates configured"
											completed={true}
										/>
										<ChecklistItem
											title="Configure referral rewards"
											description="Set up rewards for successful referrals"
											completed={false}
										/>
									</Stack>
								</Stack>

								{/* Stats */}
								<Grid columns="2" gap="md">
									<Card variant="outlined" padding="lg">
										<Stack direction="row" gap="md" align="center">
											<div
												style={{
													width: "48px",
													height: "48px",
													borderRadius: "var(--radius-full)",
													backgroundColor: "var(--color-primary)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Users
													size={24}
													style={{ color: "var(--color-primary-content)" }}
												/>
											</div>
											<Stack gap="0">
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
														textTransform: "uppercase",
														letterSpacing: "0.05em",
													}}
												>
													Total Signups
												</span>
												<span
													style={{
														fontSize: "var(--font-size-3xl)",
														fontWeight: 700,
													}}
												>
													181
												</span>
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													All users who joined
												</span>
											</Stack>
										</Stack>
									</Card>

									<Card variant="outlined" padding="lg">
										<Stack direction="row" gap="md" align="center">
											<div
												style={{
													width: "48px",
													height: "48px",
													borderRadius: "var(--radius-full)",
													backgroundColor: "var(--color-success)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<ShieldCheck
													size={24}
													style={{ color: "var(--color-success-content)" }}
												/>
											</div>
											<Stack gap="0">
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
														textTransform: "uppercase",
														letterSpacing: "0.05em",
													}}
												>
													Verified
												</span>
												<Stack direction="row" gap="sm" align="baseline">
													<span
														style={{
															fontSize: "var(--font-size-3xl)",
															fontWeight: 700,
														}}
													>
														0
													</span>
													<span
														style={{
															color: "var(--color-muted)",
															fontSize: "var(--font-size-sm)",
														}}
													>
														(0.0%)
													</span>
												</Stack>
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													Email verified users
												</span>
											</Stack>
										</Stack>
									</Card>
								</Grid>

								{/* Configuration */}
								<Stack gap="md">
									<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
										Configuration
									</h2>
									<Grid columns="3" gap="md">
										<ConfigCard icon={Mail} title="Email">
											<Badge variant="success" size="sm">
												Verification On
											</Badge>
										</ConfigCard>
										<ConfigCard icon={Share2} title="Referrals">
											<Badge variant="default" size="sm">
												Disabled
											</Badge>
										</ConfigCard>
										<ConfigCard icon={Calendar} title="Timeline">
											<Stack gap="xs">
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													Created: Dec 20, 2025
												</span>
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													Updated: Dec 29, 2025
												</span>
											</Stack>
										</ConfigCard>
									</Grid>
								</Stack>

								{/* Form Preview */}
								<Stack gap="md">
									<Stack gap="xs">
										<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
											Form Preview
										</h2>
										<p style={{ color: "var(--color-muted)", margin: 0 }}>
											See how your form will look when embedded
										</p>
									</Stack>
									<Card
										variant="outlined"
										padding="none"
										style={{ overflow: "hidden" }}
									>
										{/* Browser Chrome */}
										<div
											style={{
												backgroundColor: "var(--color-base-200)",
												padding: "var(--space-3) var(--space-4)",
												borderBottom: "1px solid var(--color-border)",
												display: "flex",
												alignItems: "center",
												gap: "var(--space-2)",
											}}
										>
											<div
												style={{
													width: "12px",
													height: "12px",
													borderRadius: "50%",
													backgroundColor: "var(--color-error)",
												}}
											/>
											<div
												style={{
													width: "12px",
													height: "12px",
													borderRadius: "50%",
													backgroundColor: "var(--color-warning)",
												}}
											/>
											<div
												style={{
													width: "12px",
													height: "12px",
													borderRadius: "50%",
													backgroundColor: "var(--color-success)",
												}}
											/>
											<span
												style={{
													marginLeft: "var(--space-4)",
													fontSize: "var(--font-size-sm)",
													color: "var(--color-muted)",
												}}
											>
												Desktop Preview
											</span>
										</div>
										{/* Preview Content */}
										<div
											style={{
												backgroundColor: "var(--color-base-100)",
												padding: "var(--space-12)",
												display: "flex",
												justifyContent: "center",
												alignItems: "center",
												minHeight: "300px",
											}}
										>
											<Card
												variant="elevated"
												padding="lg"
												style={{ width: "100%", maxWidth: "400px" }}
											>
												<Stack gap="md">
													<Stack gap="sm">
														<label style={{ fontWeight: 500 }}>
															Email{" "}
															<span style={{ color: "var(--color-error)" }}>
																*
															</span>
														</label>
														<input
															type="email"
															placeholder="your@email.com"
															style={{
																padding: "var(--space-3)",
																border: "1px solid var(--color-border)",
																borderRadius: "var(--radius-md)",
																background: "var(--color-surface)",
																width: "100%",
															}}
														/>
													</Stack>
													<Button style={{ width: "100%" }}>Join Now</Button>
												</Stack>
											</Card>
										</div>
									</Card>
								</Stack>
							</Stack>
						</Stack>
					</Container>
				</div>
			);
		};

		return <CampaignDetailDemo />;
	},
};

export const CampaignDetailPageElevated: Story = {
	name: "Campaign Detail (Elevated Style)",
	render: () => (
		<div
			style={{ backgroundColor: "var(--color-base-100)", minHeight: "100vh" }}
		>
			<Container size="xl" style={{ padding: "var(--space-8)" }}>
				<Stack gap="lg">
					{/* Breadcrumb */}
					<Stack
						direction="row"
						gap="sm"
						align="center"
						style={{ color: "var(--color-muted)" }}
					>
						<span style={{ fontSize: "var(--font-size-sm)" }}>Campaigns</span>
						<ChevronRight size={14} />
						<span
							style={{
								fontSize: "var(--font-size-sm)",
								color: "var(--color-base-content)",
							}}
						>
							Product Launch 2026
						</span>
					</Stack>

					{/* Page Header in Card */}
					<Card variant="elevated" padding="lg">
						<Stack direction="row" justify="between" align="center">
							<Stack gap="sm">
								<Stack direction="row" gap="sm" align="center">
									<h1 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>
										Product Launch 2026
									</h1>
									<Badge variant="warning">Draft</Badge>
								</Stack>
								<p style={{ color: "var(--color-muted)", margin: 0 }}>
									Monitor your campaign performance and configuration at a
									glance
								</p>
							</Stack>
							<Stack direction="row" gap="sm">
								<Button variant="outline">Preview</Button>
								<Button>Go Live</Button>
							</Stack>
						</Stack>
					</Card>

					{/* Stats Row */}
					<Grid columns="4" gap="md">
						<Card variant="elevated" padding="md">
							<Stack gap="xs">
								<span
									style={{
										color: "var(--color-muted)",
										fontSize: "var(--font-size-xs)",
										textTransform: "uppercase",
									}}
								>
									Total Signups
								</span>
								<span
									style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}
								>
									181
								</span>
							</Stack>
						</Card>
						<Card variant="elevated" padding="md">
							<Stack gap="xs">
								<span
									style={{
										color: "var(--color-muted)",
										fontSize: "var(--font-size-xs)",
										textTransform: "uppercase",
									}}
								>
									Verified
								</span>
								<span
									style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}
								>
									0
								</span>
							</Stack>
						</Card>
						<Card variant="elevated" padding="md">
							<Stack gap="xs">
								<span
									style={{
										color: "var(--color-muted)",
										fontSize: "var(--font-size-xs)",
										textTransform: "uppercase",
									}}
								>
									Referrals
								</span>
								<span
									style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}
								>
									29
								</span>
							</Stack>
						</Card>
						<Card variant="elevated" padding="md">
							<Stack gap="xs">
								<span
									style={{
										color: "var(--color-muted)",
										fontSize: "var(--font-size-xs)",
										textTransform: "uppercase",
									}}
								>
									K-Factor
								</span>
								<span
									style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}
								>
									0.2
								</span>
							</Stack>
						</Card>
					</Grid>

					{/* Two Column Layout */}
					<Grid columns="2" gap="lg">
						{/* Launch Checklist */}
						<Card variant="elevated" padding="none">
							<CardHeader>
								<Stack direction="row" justify="between" align="center">
									<h3 style={{ margin: 0 }}>Launch Checklist</h3>
									<Badge variant="success" size="sm">
										2/3 Complete
									</Badge>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="sm">
									{[
										{ title: "Configure signup form", done: true },
										{ title: "Set up email templates", done: true },
										{ title: "Configure referral rewards", done: false },
									].map((item) => (
										<Stack
											key={item.title}
											direction="row"
											gap="sm"
											align="center"
										>
											<CheckCircle2
												size={20}
												style={{
													color: item.done
														? "var(--color-success)"
														: "var(--color-base-300)",
												}}
											/>
											<span
												style={{
													textDecoration: item.done ? "line-through" : "none",
													color: item.done ? "var(--color-muted)" : "inherit",
												}}
											>
												{item.title}
											</span>
										</Stack>
									))}
								</Stack>
							</CardBody>
							<CardFooter>
								<Button variant="outline" style={{ width: "100%" }}>
									Complete Setup
								</Button>
							</CardFooter>
						</Card>

						{/* Configuration */}
						<Card variant="elevated" padding="none">
							<CardHeader>
								<h3 style={{ margin: 0 }}>Configuration</h3>
							</CardHeader>
							<CardBody>
								<Stack gap="md">
									<Stack direction="row" justify="between" align="center">
										<Stack direction="row" gap="sm" align="center">
											<Mail size={18} style={{ color: "var(--color-muted)" }} />
											<span>Email Verification</span>
										</Stack>
										<Badge variant="success" size="sm">
											Enabled
										</Badge>
									</Stack>
									<Stack direction="row" justify="between" align="center">
										<Stack direction="row" gap="sm" align="center">
											<Share2
												size={18}
												style={{ color: "var(--color-muted)" }}
											/>
											<span>Referrals</span>
										</Stack>
										<Badge variant="default" size="sm">
											Disabled
										</Badge>
									</Stack>
									<Stack direction="row" justify="between" align="center">
										<Stack direction="row" gap="sm" align="center">
											<Calendar
												size={18}
												style={{ color: "var(--color-muted)" }}
											/>
											<span>Created</span>
										</Stack>
										<span
											style={{
												color: "var(--color-muted)",
												fontSize: "var(--font-size-sm)",
											}}
										>
											Dec 20, 2025
										</span>
									</Stack>
								</Stack>
							</CardBody>
							<CardFooter>
								<Button variant="ghost" style={{ width: "100%" }}>
									<Settings size={16} />
									Manage Settings
								</Button>
							</CardFooter>
						</Card>
					</Grid>
				</Stack>
			</Container>
		</div>
	),
};

// =============================================================================
// CAMPAIGN DETAIL - SIDEBAR NAVIGATION
// =============================================================================

const navItems = [
	{ id: "overview", label: "Overview", icon: LayoutGrid },
	{ id: "leads", label: "Leads", icon: Users },
	{ id: "analytics", label: "Analytics", icon: BarChart3 },
	{ id: "form", label: "Form", icon: FileText },
	{ id: "embed", label: "Embed", icon: Code },
	{ id: "settings", label: "Settings", icon: Settings },
];

const SidebarNavItem = ({
	icon: Icon,
	label,
	active,
	onClick,
}: {
	icon: typeof LayoutGrid;
	label: string;
	active?: boolean;
	onClick?: () => void;
}) => (
	<button
		onClick={onClick}
		style={{
			display: "flex",
			alignItems: "center",
			gap: "var(--space-3)",
			padding: "var(--space-2) var(--space-3)",
			borderRadius: "var(--radius-md)",
			border: "none",
			background: active ? "var(--color-primary)" : "transparent",
			color: active ? "var(--color-primary-content)" : "var(--color-muted)",
			cursor: "pointer",
			width: "100%",
			textAlign: "left",
			fontSize: "var(--font-size-sm)",
			fontWeight: 500,
			transition: "all 150ms ease",
		}}
	>
		<Icon size={18} />
		{label}
	</button>
);

export const CampaignDetailSidebar: Story = {
	name: "Campaign Detail (Sidebar Nav)",
	render: () => {
		const SidebarNavDemo = () => {
			const [activeSection, setActiveSection] = useState("overview");

			return (
				<div style={{ display: "flex", minHeight: "100vh" }}>
					{/* Sidebar */}
					<aside
						style={{
							width: "240px",
							backgroundColor: "var(--color-surface)",
							borderRight: "1px solid var(--color-border)",
							padding: "var(--space-4)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-6)",
						}}
					>
						{/* Campaign Header */}
						<Stack gap="sm">
							<Stack
								direction="row"
								gap="sm"
								align="center"
								style={{ color: "var(--color-muted)" }}
							>
								<ChevronRight
									size={14}
									style={{ transform: "rotate(180deg)" }}
								/>
								<span style={{ fontSize: "var(--font-size-sm)" }}>
									Campaigns
								</span>
							</Stack>
							<Stack gap="xs">
								<h2 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
									Product Launch 2026
								</h2>
								<Badge variant="warning" size="sm">
									Draft
								</Badge>
							</Stack>
						</Stack>

						{/* Navigation */}
						<nav
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "var(--space-1)",
							}}
						>
							{navItems.map((item) => (
								<SidebarNavItem
									key={item.id}
									icon={item.icon}
									label={item.label}
									active={activeSection === item.id}
									onClick={() => setActiveSection(item.id)}
								/>
							))}
						</nav>

						{/* Actions at bottom */}
						<div style={{ marginTop: "auto" }}>
							<Stack gap="sm">
								<Button variant="outline" style={{ width: "100%" }}>
									Preview
								</Button>
								<Button style={{ width: "100%" }}>Go Live</Button>
							</Stack>
						</div>
					</aside>

					{/* Main Content */}
					<main style={{ flex: 1, backgroundColor: "var(--color-base-50)" }}>
						<Container size="lg" style={{ padding: "var(--space-8)" }}>
							<Stack gap="xl">
								{/* Section Header */}
								<Stack gap="xs">
									<h1 style={{ margin: 0 }}>Overview</h1>
									<p style={{ color: "var(--color-muted)", margin: 0 }}>
										Monitor your campaign performance and configuration at a
										glance
									</p>
								</Stack>

								{/* Stats */}
								<Grid columns="2" gap="md">
									<Card variant="outlined" padding="lg">
										<Stack direction="row" gap="md" align="center">
											<div
												style={{
													width: "48px",
													height: "48px",
													borderRadius: "var(--radius-full)",
													backgroundColor: "var(--color-primary)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Users
													size={24}
													style={{ color: "var(--color-primary-content)" }}
												/>
											</div>
											<Stack gap="0">
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													Total Signups
												</span>
												<span
													style={{
														fontSize: "var(--font-size-2xl)",
														fontWeight: 700,
													}}
												>
													181
												</span>
											</Stack>
										</Stack>
									</Card>
									<Card variant="outlined" padding="lg">
										<Stack direction="row" gap="md" align="center">
											<div
												style={{
													width: "48px",
													height: "48px",
													borderRadius: "var(--radius-full)",
													backgroundColor: "var(--color-success)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<ShieldCheck
													size={24}
													style={{ color: "var(--color-success-content)" }}
												/>
											</div>
											<Stack gap="0">
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													Verified
												</span>
												<span
													style={{
														fontSize: "var(--font-size-2xl)",
														fontWeight: 700,
													}}
												>
													0
												</span>
											</Stack>
										</Stack>
									</Card>
								</Grid>

								{/* Launch Checklist */}
								<Stack gap="md">
									<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
										Launch Checklist
									</h2>
									<Stack gap="sm">
										<ChecklistItem
											title="Configure signup form"
											description="1 field configured"
											completed={true}
											required
										/>
										<ChecklistItem
											title="Set up email templates"
											description="Email templates configured"
											completed={true}
										/>
										<ChecklistItem
											title="Configure referral rewards"
											description="Set up rewards for successful referrals"
											completed={false}
										/>
									</Stack>
								</Stack>

								{/* Configuration */}
								<Stack gap="md">
									<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
										Configuration
									</h2>
									<Grid columns="3" gap="md">
										<ConfigCard icon={Mail} title="Email">
											<Badge variant="success" size="sm">
												Verification On
											</Badge>
										</ConfigCard>
										<ConfigCard icon={Share2} title="Referrals">
											<Badge variant="default" size="sm">
												Disabled
											</Badge>
										</ConfigCard>
										<ConfigCard icon={Calendar} title="Timeline">
											<Stack gap="xs">
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-sm)",
													}}
												>
													Created: Dec 20, 2025
												</span>
											</Stack>
										</ConfigCard>
									</Grid>
								</Stack>
							</Stack>
						</Container>
					</main>
				</div>
			);
		};

		return <SidebarNavDemo />;
	},
};

// =============================================================================
// CAMPAIGN DETAIL - DROPDOWN NAVIGATION (Mobile-First)
// =============================================================================

export const CampaignDetailDropdown: Story = {
	name: "Campaign Detail (Dropdown Nav)",
	render: () => {
		const DropdownNavDemo = () => {
			const [activeSection, setActiveSection] = useState("overview");
			const [dropdownOpen, setDropdownOpen] = useState(false);
			const activeItem = navItems.find((item) => item.id === activeSection);
			const ActiveIcon = activeItem?.icon || LayoutGrid;

			return (
				<div
					style={{
						backgroundColor: "var(--color-base-50)",
						minHeight: "100vh",
					}}
				>
					{/* Sticky Header */}
					<header
						style={{
							position: "sticky",
							top: 0,
							backgroundColor: "var(--color-surface)",
							borderBottom: "1px solid var(--color-border)",
							zIndex: 10,
						}}
					>
						<Container
							size="xl"
							style={{ padding: "var(--space-4) var(--space-6)" }}
						>
							<Stack direction="row" justify="between" align="center">
								{/* Left: Back + Title */}
								<Stack direction="row" gap="md" align="center">
									<button
										style={{
											display: "flex",
											alignItems: "center",
											gap: "var(--space-1)",
											padding: "var(--space-2)",
											border: "none",
											background: "transparent",
											color: "var(--color-muted)",
											cursor: "pointer",
											borderRadius: "var(--radius-md)",
										}}
									>
										<ChevronRight
											size={16}
											style={{ transform: "rotate(180deg)" }}
										/>
									</button>
									<Stack gap="0">
										<Stack direction="row" gap="sm" align="center">
											<h1
												style={{ margin: 0, fontSize: "var(--font-size-lg)" }}
											>
												Product Launch 2026
											</h1>
											<Badge variant="warning" size="sm">
												Draft
											</Badge>
										</Stack>
									</Stack>
								</Stack>

								{/* Right: Actions */}
								<Stack direction="row" gap="sm">
									<Button variant="outline" size="sm">
										Preview
									</Button>
									<Button size="sm">Go Live</Button>
								</Stack>
							</Stack>
						</Container>
					</header>

					{/* Section Selector */}
					<div
						style={{
							backgroundColor: "var(--color-surface)",
							borderBottom: "1px solid var(--color-border)",
						}}
					>
						<Container
							size="xl"
							style={{ padding: "var(--space-3) var(--space-6)" }}
						>
							<div style={{ position: "relative", display: "inline-block" }}>
								<button
									onClick={() => setDropdownOpen(!dropdownOpen)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "var(--space-2)",
										padding: "var(--space-2) var(--space-3)",
										border: "1px solid var(--color-border)",
										borderRadius: "var(--radius-md)",
										background: "var(--color-base-50)",
										cursor: "pointer",
										fontSize: "var(--font-size-sm)",
										fontWeight: 500,
										minWidth: "160px",
									}}
								>
									<ActiveIcon size={16} />
									{activeItem?.label}
									<ChevronDown
										size={16}
										style={{
											marginLeft: "auto",
											transform: dropdownOpen
												? "rotate(180deg)"
												: "rotate(0deg)",
											transition: "transform 150ms ease",
										}}
									/>
								</button>

								{/* Dropdown Menu */}
								{dropdownOpen && (
									<div
										style={{
											position: "absolute",
											top: "calc(100% + var(--space-1))",
											left: 0,
											backgroundColor: "var(--color-surface)",
											border: "1px solid var(--color-border)",
											borderRadius: "var(--radius-md)",
											boxShadow: "var(--shadow-lg)",
											minWidth: "200px",
											zIndex: 20,
											overflow: "hidden",
										}}
									>
										{navItems.map((item) => {
											const Icon = item.icon;
											const isActive = activeSection === item.id;
											return (
												<button
													key={item.id}
													onClick={() => {
														setActiveSection(item.id);
														setDropdownOpen(false);
													}}
													style={{
														display: "flex",
														alignItems: "center",
														gap: "var(--space-3)",
														padding: "var(--space-3) var(--space-4)",
														border: "none",
														background: isActive
															? "var(--color-base-100)"
															: "transparent",
														color: isActive
															? "var(--color-base-content)"
															: "var(--color-muted)",
														cursor: "pointer",
														width: "100%",
														textAlign: "left",
														fontSize: "var(--font-size-sm)",
													}}
												>
													<Icon size={16} />
													{item.label}
													{isActive && (
														<Check
															size={16}
															style={{
																marginLeft: "auto",
																color: "var(--color-primary)",
															}}
														/>
													)}
												</button>
											);
										})}
									</div>
								)}
							</div>
						</Container>
					</div>

					{/* Content */}
					<Container
						size="xl"
						style={{ padding: "var(--space-8) var(--space-6)" }}
					>
						<Stack gap="xl">
							{/* Stats */}
							<Grid columns="2" gap="md">
								<Card variant="outlined" padding="lg">
									<Stack gap="xs">
										<span
											style={{
												color: "var(--color-muted)",
												fontSize: "var(--font-size-sm)",
											}}
										>
											Total Signups
										</span>
										<span
											style={{
												fontSize: "var(--font-size-2xl)",
												fontWeight: 700,
											}}
										>
											181
										</span>
									</Stack>
								</Card>
								<Card variant="outlined" padding="lg">
									<Stack gap="xs">
										<span
											style={{
												color: "var(--color-muted)",
												fontSize: "var(--font-size-sm)",
											}}
										>
											Verified
										</span>
										<span
											style={{
												fontSize: "var(--font-size-2xl)",
												fontWeight: 700,
											}}
										>
											0
										</span>
									</Stack>
								</Card>
							</Grid>

							{/* Checklist */}
							<Stack gap="md">
								<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
									Launch Checklist
								</h2>
								<Stack gap="sm">
									<ChecklistItem
										title="Configure signup form"
										description="1 field configured"
										completed={true}
										required
									/>
									<ChecklistItem
										title="Set up email templates"
										description="Email templates configured"
										completed={true}
									/>
									<ChecklistItem
										title="Configure referral rewards"
										description="Set up rewards for successful referrals"
										completed={false}
									/>
								</Stack>
							</Stack>

							{/* Configuration */}
							<Stack gap="md">
								<h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
									Configuration
								</h2>
								<Grid columns="3" gap="md">
									<ConfigCard icon={Mail} title="Email">
										<Badge variant="success" size="sm">
											Verification On
										</Badge>
									</ConfigCard>
									<ConfigCard icon={Share2} title="Referrals">
										<Badge variant="default" size="sm">
											Disabled
										</Badge>
									</ConfigCard>
									<ConfigCard icon={Calendar} title="Timeline">
										<span
											style={{
												color: "var(--color-muted)",
												fontSize: "var(--font-size-sm)",
											}}
										>
											Dec 20, 2025
										</span>
									</ConfigCard>
								</Grid>
							</Stack>
						</Stack>
					</Container>
				</div>
			);
		};

		return <DropdownNavDemo />;
	},
};

// =============================================================================
// CAMPAIGN DETAIL - PILL NAV (Compact)
// =============================================================================

export const CampaignDetailPillNav: Story = {
	name: "Campaign Detail (Pill Nav)",
	render: () => {
		const PillNavDemo = () => {
			const [activeSection, setActiveSection] = useState("overview");

			return (
				<div
					style={{
						backgroundColor: "var(--color-base-50)",
						minHeight: "100vh",
					}}
				>
					<Container size="xl" style={{ padding: "var(--space-8)" }}>
						<Stack gap="lg">
							{/* Breadcrumb */}
							<Stack
								direction="row"
								gap="sm"
								align="center"
								style={{ color: "var(--color-muted)" }}
							>
								<span style={{ fontSize: "var(--font-size-sm)" }}>
									Campaigns
								</span>
								<ChevronRight size={14} />
								<span
									style={{
										fontSize: "var(--font-size-sm)",
										color: "var(--color-base-content)",
									}}
								>
									Product Launch 2026
								</span>
							</Stack>

							{/* Header with integrated nav */}
							<Card variant="elevated" padding="lg">
								<Stack gap="md">
									<Stack direction="row" justify="between" align="start">
										<Stack gap="xs">
											<Stack direction="row" gap="sm" align="center">
												<h1
													style={{ margin: 0, fontSize: "var(--font-size-xl)" }}
												>
													Product Launch 2026
												</h1>
												<Badge variant="warning">Draft</Badge>
											</Stack>
											<p style={{ color: "var(--color-muted)", margin: 0 }}>
												Launching camp.xyz
											</p>
										</Stack>
										<Stack direction="row" gap="sm">
											<Button variant="outline">Preview</Button>
											<Button>Go Live</Button>
										</Stack>
									</Stack>

									{/* Pill Navigation */}
									<div
										style={{
											display: "flex",
											gap: "var(--space-1)",
											padding: "var(--space-1)",
											backgroundColor: "var(--color-base-100)",
											borderRadius: "var(--radius-lg)",
											width: "fit-content",
										}}
									>
										{navItems.map((item) => {
											const Icon = item.icon;
											const isActive = activeSection === item.id;
											return (
												<button
													key={item.id}
													onClick={() => setActiveSection(item.id)}
													style={{
														display: "flex",
														alignItems: "center",
														gap: "var(--space-2)",
														padding: "var(--space-2) var(--space-3)",
														border: "none",
														borderRadius: "var(--radius-md)",
														background: isActive
															? "var(--color-surface)"
															: "transparent",
														boxShadow: isActive ? "var(--shadow-sm)" : "none",
														color: isActive
															? "var(--color-base-content)"
															: "var(--color-muted)",
														cursor: "pointer",
														fontSize: "var(--font-size-sm)",
														fontWeight: 500,
														transition: "all 150ms ease",
													}}
												>
													<Icon size={14} />
													{item.label}
												</button>
											);
										})}
									</div>
								</Stack>
							</Card>

							{/* Content */}
							<Stack gap="xl">
								{/* Stats */}
								<Grid columns="4" gap="md">
									<Card variant="outlined" padding="md">
										<Stack gap="xs">
											<span
												style={{
													color: "var(--color-muted)",
													fontSize: "var(--font-size-xs)",
													textTransform: "uppercase",
												}}
											>
												Total Signups
											</span>
											<span
												style={{
													fontSize: "var(--font-size-2xl)",
													fontWeight: 700,
												}}
											>
												181
											</span>
										</Stack>
									</Card>
									<Card variant="outlined" padding="md">
										<Stack gap="xs">
											<span
												style={{
													color: "var(--color-muted)",
													fontSize: "var(--font-size-xs)",
													textTransform: "uppercase",
												}}
											>
												Verified
											</span>
											<span
												style={{
													fontSize: "var(--font-size-2xl)",
													fontWeight: 700,
												}}
											>
												0
											</span>
										</Stack>
									</Card>
									<Card variant="outlined" padding="md">
										<Stack gap="xs">
											<span
												style={{
													color: "var(--color-muted)",
													fontSize: "var(--font-size-xs)",
													textTransform: "uppercase",
												}}
											>
												Referrals
											</span>
											<span
												style={{
													fontSize: "var(--font-size-2xl)",
													fontWeight: 700,
												}}
											>
												29
											</span>
										</Stack>
									</Card>
									<Card variant="outlined" padding="md">
										<Stack gap="xs">
											<span
												style={{
													color: "var(--color-muted)",
													fontSize: "var(--font-size-xs)",
													textTransform: "uppercase",
												}}
											>
												K-Factor
											</span>
											<span
												style={{
													fontSize: "var(--font-size-2xl)",
													fontWeight: 700,
												}}
											>
												0.2
											</span>
										</Stack>
									</Card>
								</Grid>

								{/* Two Column */}
								<Grid columns="2" gap="lg">
									<Card variant="outlined" padding="none">
										<CardHeader>
											<h3 style={{ margin: 0 }}>Launch Checklist</h3>
										</CardHeader>
										<CardBody>
											<Stack gap="sm">
												{[
													{ title: "Configure signup form", done: true },
													{ title: "Set up email templates", done: true },
													{ title: "Configure referral rewards", done: false },
												].map((item) => (
													<Stack
														key={item.title}
														direction="row"
														gap="sm"
														align="center"
													>
														<CheckCircle2
															size={20}
															style={{
																color: item.done
																	? "var(--color-success)"
																	: "var(--color-base-300)",
															}}
														/>
														<span
															style={{
																color: item.done
																	? "var(--color-muted)"
																	: "inherit",
															}}
														>
															{item.title}
														</span>
													</Stack>
												))}
											</Stack>
										</CardBody>
									</Card>

									<Card variant="outlined" padding="none">
										<CardHeader>
											<h3 style={{ margin: 0 }}>Configuration</h3>
										</CardHeader>
										<CardBody>
											<Stack gap="md">
												<Stack direction="row" justify="between" align="center">
													<Stack direction="row" gap="sm" align="center">
														<Mail
															size={18}
															style={{ color: "var(--color-muted)" }}
														/>
														<span>Email Verification</span>
													</Stack>
													<Badge variant="success" size="sm">
														Enabled
													</Badge>
												</Stack>
												<Stack direction="row" justify="between" align="center">
													<Stack direction="row" gap="sm" align="center">
														<Share2
															size={18}
															style={{ color: "var(--color-muted)" }}
														/>
														<span>Referrals</span>
													</Stack>
													<Badge variant="default" size="sm">
														Disabled
													</Badge>
												</Stack>
											</Stack>
										</CardBody>
									</Card>
								</Grid>
							</Stack>
						</Stack>
					</Container>
				</div>
			);
		};

		return <PillNavDemo />;
	},
};

// =============================================================================
// FULL APP LAYOUT - Campaign Detail with Main Sidebar
// =============================================================================

export const FullAppLayout: Story = {
	name: "Full App Layout",
	render: () => {
		// Inner component that uses the banner context
		const FullAppContent = () => {
			const [activeSection, setActiveSection] = useState("overview");
			const [isMobile, setIsMobile] = useState(false);
			const { addBanner } = useBannerCenter();

			// Detect mobile viewport
			useEffect(() => {
				const checkMobile = () => setIsMobile(window.innerWidth < 768);
				checkMobile();
				window.addEventListener("resize", checkMobile);
				return () => window.removeEventListener("resize", checkMobile);
			}, []);

			const handleGoLive = () => {
				addBanner({
					type: "success",
					variant: "filled",
					title: "Campaign is now live!",
					description:
						"Product Launch 2026 has been published and is now accepting signups.",
					dismissible: true,
				});
			};

			const handleSaveDraft = () => {
				addBanner({
					type: "info",
					variant: "filled",
					title: "Draft saved",
					description: "Your changes have been saved.",
					dismissible: true,
				});
			};

			// Theme toggle that responds to collapsed state
			const SidebarThemeToggle = () => {
				const { collapsed } = useSidebarContext();
				if (collapsed) return null;
				return (
					<Button
						variant="ghost"
						size="sm"
						isIconOnly
						aria-label="Toggle theme"
					>
						<Moon size={18} />
					</Button>
				);
			};

			// User profile that responds to collapsed state
			const SidebarUserProfile = () => {
				const { collapsed } = useSidebarContext();
				return (
					<div
						style={{
							padding: collapsed
								? "var(--space-3) var(--space-2)"
								: "var(--space-3) var(--space-4)",
							borderTop: "1px solid var(--color-border)",
							display: "flex",
							justifyContent: collapsed ? "center" : "flex-start",
						}}
					>
						{collapsed ? (
							<Avatar initials="JD" size="sm" />
						) : (
							<Stack
								direction="row"
								gap="sm"
								align="center"
								style={{ width: "100%" }}
							>
								<Avatar initials="JD" size="sm" />
								<Stack gap="0" style={{ flex: 1, minWidth: 0 }}>
									<span
										style={{
											fontSize: "var(--font-size-sm)",
											fontWeight: 500,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										Jane Doe
									</span>
									<span
										style={{
											fontSize: "var(--font-size-xs)",
											color: "var(--color-muted)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										jane@acme.com
									</span>
								</Stack>
								<Button
									variant="ghost"
									size="sm"
									isIconOnly
									aria-label="Log out"
								>
									<LogOut size={16} />
								</Button>
							</Stack>
						)}
					</div>
				);
			};

			return (
				<div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
					{/* Main App Sidebar */}
					<Sidebar>
						<SidebarHeader>
							<SidebarLogo>Acme Inc</SidebarLogo>
							<Stack direction="row" gap="xs" align="center">
								<SidebarThemeToggle />
								<SidebarToggle />
							</Stack>
						</SidebarHeader>

						<SidebarSection>
							<SidebarItem icon={<Home />} href="#">
								Dashboard
							</SidebarItem>
							<SidebarItem icon={<Megaphone />} href="#" active>
								Campaigns
							</SidebarItem>
							<SidebarItem icon={<Users />} href="#">
								Leads
							</SidebarItem>
							<SidebarItem icon={<BarChart3 />} href="#">
								Analytics
							</SidebarItem>
						</SidebarSection>

						<SidebarDivider />

						<SidebarSection title="Workspace">
							<SidebarItem icon={<Folder />} href="#">
								Projects
							</SidebarItem>
							<SidebarItem icon={<Layers />} href="#">
								Templates
							</SidebarItem>
						</SidebarSection>

						<SidebarDivider />

						<SidebarSection>
							<SidebarItem icon={<Settings />} href="#">
								Settings
							</SidebarItem>
							<SidebarItem icon={<HelpCircle />} href="#">
								Help
							</SidebarItem>
						</SidebarSection>

						{/* Spacer to push user profile to bottom */}
						<div style={{ flex: 1 }} />

						{/* User Profile */}
						<SidebarUserProfile />
					</Sidebar>

					{/* Main Content Area */}
					<div
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
						}}
					>
						{/* Top Header Bar */}
						<header
							className={showcaseStyles.headerPadding}
							style={{
								backgroundColor: "var(--color-surface)",
								borderBottom: "1px solid var(--color-border)",
								flexShrink: 0,
							}}
						>
							<Stack
								direction="row"
								justify="between"
								align="center"
								wrap
								gap="sm"
							>
								<Stack
									direction="row"
									gap="sm"
									align="center"
									wrap
									style={{ minWidth: 0 }}
								>
									{/* Mobile menu button */}
									<SidebarMobileTrigger />
									{/* Breadcrumb */}
									<Stack
										direction="row"
										gap="sm"
										align="center"
										style={{ color: "var(--color-muted)" }}
									>
										<span style={{ fontSize: "var(--font-size-sm)" }}>
											Campaigns
										</span>
										<ChevronRight size={14} />
										<span
											style={{
												fontSize: "var(--font-size-sm)",
												color: "var(--color-base-content)",
												fontWeight: 500,
											}}
										>
											Product Launch 2026
										</span>
									</Stack>
									<Badge variant="warning" size="sm">
										Draft
									</Badge>
								</Stack>
								<Stack direction="row" gap="sm" style={{ flexShrink: 0 }}>
									<Button variant="outline" size="sm" onClick={handleSaveDraft}>
										Save Draft
									</Button>
									<Button size="sm" onClick={handleGoLive}>
										Go Live
									</Button>
								</Stack>
							</Stack>
						</header>

						{/* Sub-navigation - Dropdown on mobile, tabs on desktop */}
						<nav
							className={showcaseStyles.headerPadding}
							style={{
								backgroundColor: "var(--color-surface)",
								borderBottom: "1px solid var(--color-border)",
								flexShrink: 0,
							}}
						>
							{isMobile ? (
								// Mobile: Dropdown selector
								<Dropdown
									items={navItems.map((item) => ({
										id: item.id,
										label: item.label,
										icon: <item.icon size={16} />,
									}))}
									value={activeSection}
									onChange={setActiveSection}
									fullWidth
								/>
							) : (
								// Desktop: Horizontal tabs
								<div
									style={{
										display: "flex",
										gap: "var(--space-1)",
										margin: "0 calc(-1 * var(--space-4))",
									}}
								>
									{navItems.map((item) => {
										const Icon = item.icon;
										const isActive = activeSection === item.id;
										return (
											<button
												key={item.id}
												onClick={() => setActiveSection(item.id)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: "var(--space-2)",
													padding: "var(--space-3) var(--space-4)",
													border: "none",
													borderBottom: isActive
														? "2px solid var(--color-primary)"
														: "2px solid transparent",
													background: "transparent",
													color: isActive
														? "var(--color-base-content)"
														: "var(--color-muted)",
													cursor: "pointer",
													fontSize: "var(--font-size-sm)",
													fontWeight: 500,
													marginBottom: "-1px",
												}}
											>
												<Icon size={16} />
												{item.label}
											</button>
										);
									})}
								</div>
							)}
						</nav>

						{/* Scrollable Content */}
						<main
							style={{
								flex: 1,
								overflow: "auto",
								backgroundColor: "var(--color-base-50)",
							}}
						>
							<div className={showcaseStyles.contentPadding}>
								<Stack gap="lg" animate key={activeSection}>
									{/* Stats Row */}
									<Grid columns="4" gap="md">
										<Card variant="outlined" padding="md">
											<Stack gap="xs">
												<Stack direction="row" justify="between" align="center">
													<span
														style={{
															color: "var(--color-muted)",
															fontSize: "var(--font-size-xs)",
															textTransform: "uppercase",
														}}
													>
														Total Signups
													</span>
													<Users
														size={16}
														style={{ color: "var(--color-muted)" }}
													/>
												</Stack>
												<span
													style={{
														fontSize: "var(--font-size-2xl)",
														fontWeight: 700,
													}}
												>
													181
												</span>
												<span
													style={{
														color: "var(--color-success)",
														fontSize: "var(--font-size-xs)",
													}}
												>
													+12% from last week
												</span>
											</Stack>
										</Card>
										<Card variant="outlined" padding="md">
											<Stack gap="xs">
												<Stack direction="row" justify="between" align="center">
													<span
														style={{
															color: "var(--color-muted)",
															fontSize: "var(--font-size-xs)",
															textTransform: "uppercase",
														}}
													>
														Verified
													</span>
													<ShieldCheck
														size={16}
														style={{ color: "var(--color-muted)" }}
													/>
												</Stack>
												<span
													style={{
														fontSize: "var(--font-size-2xl)",
														fontWeight: 700,
													}}
												>
													0
												</span>
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-xs)",
													}}
												>
													0.0% rate
												</span>
											</Stack>
										</Card>
										<Card variant="outlined" padding="md">
											<Stack gap="xs">
												<Stack direction="row" justify="between" align="center">
													<span
														style={{
															color: "var(--color-muted)",
															fontSize: "var(--font-size-xs)",
															textTransform: "uppercase",
														}}
													>
														Referrals
													</span>
													<Share2
														size={16}
														style={{ color: "var(--color-muted)" }}
													/>
												</Stack>
												<span
													style={{
														fontSize: "var(--font-size-2xl)",
														fontWeight: 700,
													}}
												>
													29
												</span>
												<span
													style={{
														color: "var(--color-success)",
														fontSize: "var(--font-size-xs)",
													}}
												>
													+5 this week
												</span>
											</Stack>
										</Card>
										<Card variant="outlined" padding="md">
											<Stack gap="xs">
												<Stack direction="row" justify="between" align="center">
													<span
														style={{
															color: "var(--color-muted)",
															fontSize: "var(--font-size-xs)",
															textTransform: "uppercase",
														}}
													>
														K-Factor
													</span>
													<TrendingUp
														size={16}
														style={{ color: "var(--color-muted)" }}
													/>
												</Stack>
												<span
													style={{
														fontSize: "var(--font-size-2xl)",
														fontWeight: 700,
													}}
												>
													0.2
												</span>
												<span
													style={{
														color: "var(--color-muted)",
														fontSize: "var(--font-size-xs)",
													}}
												>
													Viral coefficient
												</span>
											</Stack>
										</Card>
									</Grid>

									{/* Two Column Layout */}
									<Grid columns="2" gap="lg">
										{/* Launch Checklist */}
										<Card variant="outlined" padding="none">
											<CardHeader>
												<Stack direction="row" justify="between" align="center">
													<Stack gap="xs">
														<h3 style={{ margin: 0 }}>Launch Checklist</h3>
														<p
															style={{
																margin: 0,
																color: "var(--color-muted)",
																fontSize: "var(--font-size-sm)",
															}}
														>
															Complete these steps before going live
														</p>
													</Stack>
													<Badge variant="warning">2/3 Complete</Badge>
												</Stack>
											</CardHeader>
											<CardBody>
												<Stack gap="sm">
													<ChecklistItem
														title="Configure signup form"
														description="1 field configured"
														completed={true}
														required
													/>
													<ChecklistItem
														title="Set up email templates"
														description="Email templates configured"
														completed={true}
													/>
													<ChecklistItem
														title="Configure referral rewards"
														description="Set up rewards for successful referrals"
														completed={false}
													/>
												</Stack>
											</CardBody>
											<CardFooter>
												<Button variant="outline">
													Set Up Referral Rewards
													<ChevronRight size={16} />
												</Button>
											</CardFooter>
										</Card>

										{/* Configuration */}
										<Card variant="outlined" padding="none">
											<CardHeader>
												<h3 style={{ margin: 0 }}>Configuration</h3>
											</CardHeader>
											<CardBody>
												<Stack gap="md">
													<Stack
														direction="row"
														justify="between"
														align="center"
													>
														<Stack direction="row" gap="sm" align="center">
															<Mail
																size={18}
																style={{ color: "var(--color-muted)" }}
															/>
															<span>Email Verification</span>
														</Stack>
														<Badge variant="success" size="sm">
															On
														</Badge>
													</Stack>
													<Stack
														direction="row"
														justify="between"
														align="center"
													>
														<Stack direction="row" gap="sm" align="center">
															<Share2
																size={18}
																style={{ color: "var(--color-muted)" }}
															/>
															<span>Referrals</span>
														</Stack>
														<Badge variant="default" size="sm">
															Off
														</Badge>
													</Stack>
													<Stack
														direction="row"
														justify="between"
														align="center"
													>
														<Stack direction="row" gap="sm" align="center">
															<Calendar
																size={18}
																style={{ color: "var(--color-muted)" }}
															/>
															<span>Created</span>
														</Stack>
														<span
															style={{
																color: "var(--color-muted)",
																fontSize: "var(--font-size-sm)",
															}}
														>
															Dec 20
														</span>
													</Stack>
												</Stack>
											</CardBody>
											<CardFooter>
												<Button variant="ghost" style={{ width: "100%" }}>
													<Settings size={16} />
													Settings
												</Button>
											</CardFooter>
										</Card>
									</Grid>

									{/* Form Preview */}
									<Card
										variant="outlined"
										padding="none"
										style={{ overflow: "hidden" }}
									>
										<CardHeader>
											<Stack direction="row" justify="between" align="center">
												<Stack gap="xs">
													<h3 style={{ margin: 0 }}>Form Preview</h3>
													<p
														style={{
															margin: 0,
															color: "var(--color-muted)",
															fontSize: "var(--font-size-sm)",
														}}
													>
														See how your form will look when embedded
													</p>
												</Stack>
												<Stack direction="row" gap="sm">
													<Button variant="ghost" size="sm">
														Desktop
													</Button>
													<Button variant="ghost" size="sm">
														Mobile
													</Button>
												</Stack>
											</Stack>
										</CardHeader>
										<div
											style={{
												backgroundColor: "var(--color-base-100)",
												padding: "var(--space-8)",
												display: "flex",
												justifyContent: "center",
												alignItems: "center",
												minHeight: "280px",
											}}
										>
											<Card
												variant="elevated"
												padding="lg"
												style={{ width: "100%", maxWidth: "380px" }}
											>
												<Stack gap="md">
													<Stack gap="sm">
														<label
															style={{
																fontWeight: 500,
																fontSize: "var(--font-size-sm)",
															}}
														>
															Email{" "}
															<span style={{ color: "var(--color-error)" }}>
																*
															</span>
														</label>
														<input
															type="email"
															placeholder="your@email.com"
															style={{
																padding: "var(--space-3)",
																border: "1px solid var(--color-border)",
																borderRadius: "var(--radius-md)",
																background: "var(--color-surface)",
																width: "100%",
																fontSize: "var(--font-size-sm)",
															}}
														/>
													</Stack>
													<Button style={{ width: "100%" }}>
														Join Waitlist
													</Button>
													<p
														style={{
															margin: 0,
															textAlign: "center",
															color: "var(--color-muted)",
															fontSize: "var(--font-size-xs)",
														}}
													>
														By joining, you agree to our Terms of Service
													</p>
												</Stack>
											</Card>
										</div>
									</Card>
								</Stack>
							</div>
						</main>
					</div>
				</div>
			);
		};

		// Wrapper component that provides the context
		const FullAppDemo = () => (
			<BannerCenterProvider>
				<SidebarProvider responsive>
					<FullAppContent />
				</SidebarProvider>
			</BannerCenterProvider>
		);

		return <FullAppDemo />;
	},
};

// =============================================================================
// FULL APP - CAMPAIGNS LIST
// =============================================================================

export const FullAppCampaignsList: Story = {
	name: "Full App - Campaigns List",
	render: () => {
		const FullAppCampaignsDemo = () => {
			const [view, setView] = useState<"grid" | "list">("grid");

			return (
				<SidebarProvider responsive>
					<div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
						{/* Main App Sidebar */}
						<Sidebar>
							<SidebarHeader>
								<SidebarLogo>Acme Inc</SidebarLogo>
								<SidebarToggle />
							</SidebarHeader>

							<SidebarSection>
								<SidebarItem icon={<Home />} href="#">
									Dashboard
								</SidebarItem>
								<SidebarItem icon={<Megaphone />} href="#" active badge="4">
									Campaigns
								</SidebarItem>
								<SidebarItem icon={<Users />} href="#">
									Leads
								</SidebarItem>
								<SidebarItem icon={<BarChart3 />} href="#">
									Analytics
								</SidebarItem>
							</SidebarSection>

							<SidebarDivider />

							<SidebarSection title="Workspace">
								<SidebarItem icon={<Folder />} href="#">
									Projects
								</SidebarItem>
								<SidebarItem icon={<Layers />} href="#">
									Templates
								</SidebarItem>
							</SidebarSection>

							<SidebarDivider />

							<SidebarSection>
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

						{/* Main Content Area */}
						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
							}}
						>
							{/* Page Header */}
							<header
								className={showcaseStyles.headerPadding}
								style={{
									backgroundColor: "var(--color-surface)",
									borderBottom: "1px solid var(--color-border)",
									flexShrink: 0,
								}}
							>
								<Stack
									direction="row"
									justify="between"
									align="center"
									wrap
									gap="sm"
								>
									<Stack
										direction="row"
										gap="sm"
										align="center"
										style={{ minWidth: 0 }}
									>
										{/* Mobile menu button */}
										<SidebarMobileTrigger />
										<Stack gap="0">
											<h1
												style={{ margin: 0, fontSize: "var(--font-size-lg)" }}
											>
												Campaigns
											</h1>
											<p
												style={{
													color: "var(--color-muted)",
													margin: 0,
													fontSize: "var(--font-size-sm)",
												}}
											>
												Create and manage your marketing campaigns
											</p>
										</Stack>
									</Stack>
									<Button style={{ flexShrink: 0 }}>
										<Plus size={16} />
										Create Campaign
									</Button>
								</Stack>
							</header>

							{/* Filters Bar */}
							<div
								className={showcaseStyles.headerPadding}
								style={{
									backgroundColor: "var(--color-surface)",
									borderBottom: "1px solid var(--color-border)",
									flexShrink: 0,
									overflowX: "auto",
								}}
							>
								<Stack
									direction="row"
									justify="between"
									align="center"
									gap="sm"
									style={{ minWidth: "max-content" }}
								>
									<Stack direction="row" gap="sm" align="center">
										{/* Search */}
										<div style={{ position: "relative" }}>
											<Search
												size={16}
												style={{
													position: "absolute",
													left: "var(--space-3)",
													top: "50%",
													transform: "translateY(-50%)",
													color: "var(--color-muted)",
												}}
											/>
											<input
												type="text"
												placeholder="Search..."
												style={{
													width: "160px",
													padding:
														"var(--space-2) var(--space-3) var(--space-2) var(--space-9)",
													border: "1px solid var(--color-border)",
													borderRadius: "var(--radius-md)",
													background: "var(--color-base-50)",
													fontSize: "var(--font-size-sm)",
												}}
											/>
										</div>

										{/* Filter Pills */}
										<Stack direction="row" gap="xs">
											{["All", "Active", "Draft", "Paused"].map((filter, i) => (
												<button
													key={filter}
													style={{
														padding: "var(--space-1-5) var(--space-3)",
														border: "1px solid var(--color-border)",
														borderRadius: "var(--radius-full)",
														background:
															i === 0
																? "var(--color-base-content)"
																: "transparent",
														color:
															i === 0
																? "var(--color-base-100)"
																: "var(--color-muted)",
														cursor: "pointer",
														fontSize: "var(--font-size-sm)",
														whiteSpace: "nowrap",
													}}
												>
													{filter}
												</button>
											))}
										</Stack>
									</Stack>

									{/* View Toggle */}
									<Stack direction="row" gap="xs">
										<Button
											variant={view === "grid" ? "secondary" : "ghost"}
											size="sm"
											onClick={() => setView("grid")}
										>
											<Grid3X3 size={16} />
										</Button>
										<Button
											variant={view === "list" ? "secondary" : "ghost"}
											size="sm"
											onClick={() => setView("list")}
										>
											<List size={16} />
										</Button>
									</Stack>
								</Stack>
							</div>

							{/* Scrollable Content */}
							<main
								style={{
									flex: 1,
									overflow: "auto",
									backgroundColor: "var(--color-base-50)",
								}}
							>
								<div className={showcaseStyles.contentPadding}>
									<Stack gap="md">
										<p
											style={{
												margin: 0,
												color: "var(--color-muted)",
												fontSize: "var(--font-size-sm)",
											}}
										>
											{campaigns.length} campaigns
										</p>

										<Grid columns={view === "grid" ? "3" : "1"} gap="md">
											{campaigns.map((campaign) => (
												<CampaignCard key={campaign.id} campaign={campaign} />
											))}
										</Grid>
									</Stack>
								</div>
							</main>
						</div>
					</div>
				</SidebarProvider>
			);
		};

		return <FullAppCampaignsDemo />;
	},
};
