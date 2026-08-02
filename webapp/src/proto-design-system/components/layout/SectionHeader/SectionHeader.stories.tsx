import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
	title: "Layout/SectionHeader",
	component: SectionHeader,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC — single prop combinations
// =============================================================================

export const TitleOnly: Story = {
	args: {
		title: "Campaign Performance",
	},
};

export const WithEyebrow: Story = {
	args: {
		eyebrow: "OVERVIEW · 4 TOTAL",
		title: "Campaign Performance",
	},
};

export const WithDescription: Story = {
	args: {
		eyebrow: "ANALYTICS",
		title: "Signups over time",
		description:
			"Visualize how your campaign is growing day by day. Adjust the period to zoom in.",
	},
};

export const WithActions: Story = {
	args: {
		eyebrow: "CAMPAIGNS · 4 ACTIVE",
		title: "Your campaigns",
		actions: <Button size="sm">New campaign</Button>,
	},
};

export const WithActionsAndDescription: Story = {
	args: {
		eyebrow: "TEAM · 3 OF 5 SEATS",
		title: "Members",
		description:
			"Manage who has access to this workspace. Owners can invite and remove members.",
		actions: <Button size="sm">Invite member</Button>,
	},
};

// =============================================================================
// SIZE VARIANTS
// =============================================================================

export const SizeMd: Story = {
	name: "Size / md (default)",
	args: {
		eyebrow: "SECTION",
		title: "Section header at md size",
		description: "16px title — the default size for most sections.",
	},
};

export const SizeSm: Story = {
	name: "Size / sm",
	args: {
		eyebrow: "SECTION",
		title: "Section header at sm size",
		description: "15px title — use inside denser UI regions.",
		size: "sm",
	},
};

// =============================================================================
// HEADING LEVEL OVERRIDE (as prop)
// =============================================================================

export const AsH3: Story = {
	name: "as h3 (nested section)",
	args: {
		eyebrow: "SUBSECTION",
		title: "Rendered as h3",
		as: "h3",
	},
};

// =============================================================================
// REAL-WORLD SHOWCASE
// =============================================================================

export const DashboardAtAGlance: Story = {
	name: "Dashboard — At a glance",
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-4)",
			}}
		>
			<SectionHeader eyebrow="AT A GLANCE" title="Your numbers" />
			<p
				style={{
					color: "var(--color-base-content-secondary)",
					fontSize: "var(--font-size-sm)",
					margin: 0,
				}}
			>
				(KPI grid would render below)
			</p>
		</div>
	),
};

export const CampaignSection: Story = {
	name: "Campaign — Section with action",
	render: () => (
		<SectionHeader
			eyebrow="CAMPAIGNS · 4 ACTIVE"
			title="Your campaigns"
			actions={<Button size="sm">New campaign</Button>}
		/>
	),
};

export const TeamSection: Story = {
	name: "Team — Section with description + action",
	render: () => (
		<SectionHeader
			eyebrow="WORKSPACE · 3 OF 5 SEATS"
			title="Team members"
			description="Invite teammates to collaborate on your campaigns."
			actions={<Button size="sm">Invite</Button>}
		/>
	),
};
