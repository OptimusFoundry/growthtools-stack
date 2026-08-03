import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Gift, ShieldAlert, Zap } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { BannerCenterProvider, useBannerCenter } from "./BannerCenter";

const meta: Meta = {
	title: "Feedback/BannerCenter",
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<BannerCenterProvider>
				<div style={{ minHeight: "100vh", paddingTop: "150px" }}>
					<Story />
				</div>
			</BannerCenterProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// DEMO CONTROLS
// =============================================================================

function BannerControls() {
	const { addBanner, clearDismissible, clearAll } = useBannerCenter();

	const addInfoBanner = () => {
		addBanner({
			type: "info",
			title: "New version available",
			description: "Version 4.2 is now ready to install.",
			action: (
				<Button size="sm" variant="ghost">
					Update Now
				</Button>
			),
		});
	};

	const addSuccessBanner = () => {
		addBanner({
			type: "success",
			title: "Payment successful",
			description: "Your invoice #INV-2201 has been paid in full.",
		});
	};

	const addWarningBanner = () => {
		addBanner({
			type: "warning",
			title: "Storage almost full",
			description: "You have used 90% of your 100 GB storage quota.",
			action: (
				<Button size="sm" variant="ghost">
					Upgrade
				</Button>
			),
		});
	};

	const addErrorBanner = () => {
		addBanner({
			type: "error",
			title: "Connection lost",
			description: "Unable to reach the server. Retrying in the background.",
		});
	};

	const addFeatureBanner = () => {
		addBanner({
			type: "feature",
			title: "AI summaries are here",
			description: "Get an instant recap of any thread from the menu.",
			icon: <Zap />,
			action: (
				<Button size="sm" variant="ghost">
					Learn More
				</Button>
			),
		});
	};

	const addNonDismissible = () => {
		addBanner({
			type: "warning",
			variant: "filled",
			title: "Maintenance scheduled",
			description: "System will be down for maintenance at 2:00 AM PST.",
			dismissible: false,
		});
	};

	return (
		<div
			style={{
				padding: "var(--space-6)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-4)",
			}}
		>
			<h3 style={{ margin: 0 }}>Add Dismissible Banners</h3>
			<div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
				<Button onClick={addInfoBanner}>Info</Button>
				<Button onClick={addSuccessBanner}>Success</Button>
				<Button onClick={addWarningBanner}>Warning</Button>
				<Button onClick={addErrorBanner}>Error</Button>
				<Button onClick={addFeatureBanner}>Feature</Button>
			</div>

			<h3 style={{ margin: 0, marginTop: "var(--space-4)" }}>
				Add Non-Dismissible Banner
			</h3>
			<div style={{ display: "flex", gap: "var(--space-2)" }}>
				<Button onClick={addNonDismissible} variant="outline">
					Add Maintenance Notice
				</Button>
			</div>

			<h3 style={{ margin: 0, marginTop: "var(--space-4)" }}>Clear Banners</h3>
			<div style={{ display: "flex", gap: "var(--space-2)" }}>
				<Button onClick={clearDismissible} variant="outline">
					Clear Dismissible
				</Button>
				<Button onClick={clearAll} variant="destructive">
					Clear All
				</Button>
			</div>
		</div>
	);
}

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: () => <BannerControls />,
};

// =============================================================================
// VARIANTS
// =============================================================================

function VariantDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "filled-demo",
			type: "info",
			variant: "filled",
			title: "Scheduled maintenance tonight",
			description: "Expect brief downtime between 11 PM and 12 AM PST.",
		});
		addBanner({
			id: "light-demo",
			type: "success",
			variant: "light",
			title: "Backup complete",
			description: "Your workspace was backed up successfully.",
		});
		addBanner({
			id: "lighter-demo",
			type: "warning",
			variant: "lighter",
			title: "Two invites pending",
			description: "Invitations to acme.com are awaiting acceptance.",
		});
		addBanner({
			id: "stroke-demo",
			type: "error",
			variant: "stroke",
			title: "Webhook delivery failing",
			description: "The last 4 delivery attempts to your endpoint failed.",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>Banners with different variants are shown above.</p>
		</div>
	);
}

export const Variants: Story = {
	render: () => <VariantDemo />,
};

// =============================================================================
// WITH NON-DISMISSIBLE
// =============================================================================

function NonDismissibleDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "maintenance",
			type: "warning",
			variant: "filled",
			title: "System maintenance tonight",
			description: "Scheduled maintenance tonight at 11 PM EST.",
			dismissible: false,
		});

		addBanner({
			id: "notification-1",
			type: "info",
			title: "New message",
			description: "You have 3 unread messages from your team.",
		});

		addBanner({
			id: "notification-2",
			type: "success",
			title: "Export complete",
			description: "Your quarterly report has finished generating.",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>
				Notice how the non-dismissible warning banner stays at the bottom while
				dismissible banners stack on top.
			</p>
		</div>
	);
}

export const WithNonDismissible: Story = {
	render: () => <NonDismissibleDemo />,
};

// =============================================================================
// ALL TYPES
// =============================================================================

function AllTypesDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "info",
			type: "info",
			title: "New version available",
			description: "Version 4.2 is ready to install.",
		});
		addBanner({
			id: "success",
			type: "success",
			title: "Domain verified",
			description: "app.yourcompany.com is now connected.",
		});
		addBanner({
			id: "warning",
			type: "warning",
			title: "Trial ends in 3 days",
			description: "Add a payment method to keep your workspace active.",
		});
		addBanner({
			id: "error",
			type: "error",
			title: "Sync failed",
			description: "We couldn't reach your Salesforce account.",
		});
		addBanner({
			id: "feature",
			type: "feature",
			title: "Custom roles now available",
			description: "Define granular permissions for your team.",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>All banner types shown above.</p>
		</div>
	);
}

export const AllTypes: Story = {
	render: () => <AllTypesDemo />,
};

// =============================================================================
// WITH ACTIONS
// =============================================================================

function ActionsDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "action-banner",
			type: "info",
			title: "New version available",
			description: "Version 4.2 includes performance improvements.",
			action: (
				<Button size="sm" variant="ghost" onClick={() => alert("Updating...")}>
					Update Now
				</Button>
			),
		});

		addBanner({
			id: "promo-banner",
			type: "feature",
			variant: "filled",
			icon: <Gift />,
			title: "Annual billing discount",
			description: "Switch to yearly billing and save 20%.",
			action: (
				<Button size="sm" variant="ghost">
					Claim Offer
				</Button>
			),
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>Banners with action buttons shown above.</p>
		</div>
	);
}

export const WithActions: Story = {
	render: () => <ActionsDemo />,
};

// =============================================================================
// CUSTOM ICONS
// =============================================================================

function CustomIconsDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "bell",
			type: "info",
			icon: <Bell />,
			title: "Notifications enabled",
			description: "You'll receive a push notification for new mentions.",
		});

		addBanner({
			id: "shield",
			type: "warning",
			icon: <ShieldAlert />,
			title: "Security alert",
			description: "Unusual login detected from a new device in Berlin.",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>Banners with custom icons shown above.</p>
		</div>
	);
}

export const CustomIcons: Story = {
	render: () => <CustomIconsDemo />,
};

// =============================================================================
// MULTIPLE NON-DISMISSIBLE
// =============================================================================

function MultipleNonDismissibleDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "system-critical",
			type: "error",
			variant: "filled",
			title: "Critical security update required",
			description: "Update your API keys before they're revoked on Friday.",
			dismissible: false,
		});

		addBanner({
			id: "system-maintenance",
			type: "warning",
			variant: "filled",
			title: "Scheduled maintenance tonight at 11 PM EST",
			dismissible: false,
		});

		addBanner({
			id: "notification",
			type: "info",
			title: "3 new comments on your last deploy",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>
				Non-dismissible system banners stack at the bottom row; dismissible
				notifications stack above them.
			</p>
		</div>
	);
}

export const MultipleNonDismissible: Story = {
	render: () => <MultipleNonDismissibleDemo />,
};

// =============================================================================
// SHOWCASE
// =============================================================================

function DashboardSceneDemo() {
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		addBanner({
			id: "scene-trial",
			type: "warning",
			variant: "filled",
			title: "Trial ends in 3 days",
			description: "Add a payment method to avoid losing access.",
			action: (
				<Button size="sm" variant="ghost">
					Add payment method
				</Button>
			),
			dismissible: false,
		});

		addBanner({
			id: "scene-invite",
			type: "info",
			title: "Priya accepted your invite",
			description: "She now has editor access to the Marketing workspace.",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
				Dashboard
			</h3>
			<p
				style={{
					marginTop: "var(--space-2)",
					color: "var(--color-muted)",
					fontSize: "0.9375rem",
				}}
			>
				A pinned billing warning and a dismissible team update, exactly as
				they'd appear above a real dashboard.
			</p>
		</div>
	);
}

export const Showcase: Story = {
	name: "Showcase — Dashboard Scene",
	render: () => <DashboardSceneDemo />,
};
