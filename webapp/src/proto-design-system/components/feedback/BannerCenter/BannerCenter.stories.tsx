import type { Meta, StoryObj } from "@storybook/react";
import { Bell, Gift, ShieldAlert, Zap } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../primitives/Button";
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
			title: "New update available",
			description: "Version 2.0 is now ready to install.",
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
			description: "Your transaction has been completed.",
		});
	};

	const addWarningBanner = () => {
		addBanner({
			type: "warning",
			title: "Storage almost full",
			description: "You have used 90% of your storage quota.",
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
			description: "Unable to connect to the server.",
		});
	};

	const addFeatureBanner = () => {
		addBanner({
			type: "feature",
			title: "Try our new feature",
			description: "AI-powered suggestions are now available.",
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
			description: "System will be down for maintenance at 2:00 AM.",
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
			title: "Filled variant",
			description: "This is a filled banner.",
		});
		addBanner({
			id: "light-demo",
			type: "success",
			variant: "light",
			title: "Light variant",
			description: "This is a light banner.",
		});
		addBanner({
			id: "lighter-demo",
			type: "warning",
			variant: "lighter",
			title: "Lighter variant",
			description: "This is a lighter banner.",
		});
		addBanner({
			id: "stroke-demo",
			type: "error",
			variant: "stroke",
			title: "Stroke variant",
			description: "This is a stroke banner.",
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
		// Non-dismissible banner (will appear at bottom)
		addBanner({
			id: "maintenance",
			type: "warning",
			variant: "filled",
			title: "System Maintenance",
			description: "Scheduled maintenance tonight at 11 PM EST.",
			dismissible: false,
		});

		// Dismissible banners (will appear on top)
		addBanner({
			id: "notification-1",
			type: "info",
			title: "New message",
			description: "You have 3 unread messages.",
		});

		addBanner({
			id: "notification-2",
			type: "success",
			title: "Upload complete",
			description: "Your file has been uploaded successfully.",
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
			title: "Information",
			description: "Here is some helpful information.",
		});
		addBanner({
			id: "success",
			type: "success",
			title: "Success",
			description: "Operation completed successfully.",
		});
		addBanner({
			id: "warning",
			type: "warning",
			title: "Warning",
			description: "Please review this warning.",
		});
		addBanner({
			id: "error",
			type: "error",
			title: "Error",
			description: "Something went wrong.",
		});
		addBanner({
			id: "feature",
			type: "feature",
			title: "New Feature",
			description: "Check out our latest feature.",
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
			description: "Click update to get the latest features.",
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
			title: "Limited time offer",
			description: "Get 50% off on annual plans.",
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
			description: "You will receive push notifications.",
		});

		addBanner({
			id: "shield",
			type: "warning",
			icon: <ShieldAlert />,
			title: "Security alert",
			description: "Unusual login detected from new device.",
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
			title: "Critical Security Update Required",
			dismissible: false,
		});

		addBanner({
			id: "system-maintenance",
			type: "warning",
			variant: "filled",
			title: "Scheduled Maintenance Tonight",
			dismissible: false,
		});

		addBanner({
			id: "notification",
			type: "info",
			title: "This is a dismissible notification",
		});
	}, [addBanner]);

	return (
		<div style={{ padding: "var(--space-6)" }}>
			<p>
				Multiple non-dismissible banners stack in the bottom row, dismissible
				ones on top.
			</p>
		</div>
	);
}

export const MultipleNonDismissible: Story = {
	render: () => <MultipleNonDismissibleDemo />,
};
