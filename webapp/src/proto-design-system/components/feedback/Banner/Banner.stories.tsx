import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banner } from "./Banner";

const meta: Meta<typeof Banner> = {
	title: "Feedback/Banner",
	component: Banner,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		type: {
			control: "select",
			options: ["info", "success", "warning", "error", "feature"],
		},
		variant: {
			control: "select",
			options: ["filled", "light", "lighter", "stroke"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Default: Story = {
	args: {
		type: "info",
		variant: "light",
		title: "New version available",
		description:
			"Version 4.2 is ready to install. Refresh the page to pick it up.",
	},
};

export const FilledVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<Banner
				type="info"
				variant="filled"
				title="Scheduled maintenance tonight"
				description="Expect brief downtime between 11 PM and 12 AM PST."
			/>
			<Banner
				type="success"
				variant="filled"
				title="Payment confirmed"
				description="Your invoice #INV-2201 has been paid in full."
			/>
			<Banner
				type="warning"
				variant="filled"
				title="Trial ends in 3 days"
				description="Add a payment method to keep your workspace active."
			/>
			<Banner
				type="error"
				variant="filled"
				title="Sync failed"
				description="We couldn't reach your Salesforce account. Reconnect to resume syncing."
			/>
			<Banner
				type="feature"
				variant="filled"
				title="AI summaries are here"
				description="Get an instant recap of any thread from the conversation menu."
			/>
		</div>
	),
};

export const LightVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<Banner
				type="info"
				variant="light"
				title="New version available"
				description="Version 4.2 is ready to install."
			/>
			<Banner
				type="success"
				variant="light"
				title="Backup complete"
				description="Your workspace was backed up successfully."
			/>
			<Banner
				type="warning"
				variant="light"
				title="Storage almost full"
				description="You've used 90% of your 100 GB plan."
			/>
			<Banner
				type="error"
				variant="light"
				title="API key expiring"
				description="Your production key expires in 48 hours."
			/>
			<Banner
				type="feature"
				variant="light"
				title="Try the new dashboard"
				description="Switch to the redesigned analytics view."
			/>
		</div>
	),
};

export const LighterVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<Banner
				type="info"
				variant="lighter"
				title="Reminder: quarterly review"
				description="Your team's Q3 usage report is ready to view."
			/>
			<Banner
				type="success"
				variant="lighter"
				title="Domain verified"
				description="app.yourcompany.com is now connected."
			/>
			<Banner
				type="warning"
				variant="lighter"
				title="Two team members pending"
				description="Invitations to acme.com are awaiting acceptance."
			/>
			<Banner
				type="error"
				variant="lighter"
				title="Webhook delivery failing"
				description="The last 4 delivery attempts to your endpoint failed."
			/>
			<Banner
				type="feature"
				variant="lighter"
				title="Custom roles now available"
				description="Define granular permissions for your team."
			/>
		</div>
	),
};

export const StrokeVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<Banner
				type="info"
				variant="stroke"
				title="We use cookies"
				description="This site uses cookies to keep you signed in and remember preferences."
			/>
			<Banner
				type="success"
				variant="stroke"
				title="Export ready"
				description="Your CSV export has finished generating."
			/>
			<Banner
				type="warning"
				variant="stroke"
				title="Unsaved changes"
				description="You have edits that haven't been published yet."
			/>
			<Banner
				type="error"
				variant="stroke"
				title="Billing issue detected"
				description="Your last payment attempt was declined."
			/>
			<Banner
				type="feature"
				variant="stroke"
				title="Keyboard shortcuts"
				description="Press ? at any time to view available shortcuts."
			/>
		</div>
	),
};

export const WithAction: Story = {
	args: {
		type: "feature",
		variant: "filled",
		title: "Upgrade to Pro",
		description: "Unlock unlimited projects, SSO, and priority support.",
		action: (
			<button
				type="button"
				style={{
					background: "white",
					color: "black",
					border: "none",
					padding: "4px 12px",
					borderRadius: "4px",
					cursor: "pointer",
					fontSize: "14px",
					fontWeight: 500,
				}}
			>
				Upgrade now
			</button>
		),
	},
};

export const TitleOnly: Story = {
	args: {
		type: "success",
		variant: "light",
		title: "Your profile has been updated successfully",
	},
};

export const NonDismissible: Story = {
	args: {
		type: "warning",
		variant: "light",
		title: "Maintenance scheduled",
		description: "The system will be unavailable on Sunday from 2-4 AM PST",
		dismissible: false,
	},
};

export const CookieBanner: Story = {
	args: {
		type: "info",
		variant: "stroke",
		title: "We use cookies",
		description:
			"This website uses cookies to ensure you get the best experience",
		action: (
			<button
				type="button"
				style={{
					background: "var(--color-primary)",
					color: "white",
					border: "none",
					padding: "6px 16px",
					borderRadius: "6px",
					cursor: "pointer",
					fontSize: "14px",
					fontWeight: 500,
				}}
			>
				Accept
			</button>
		),
	},
};

export const AboveDashboard: Story = {
	name: "Showcase — Banner Above Dashboard",
	render: () => (
		<div style={{ background: "var(--color-base-100)", minHeight: "320px" }}>
			<Banner
				type="warning"
				variant="filled"
				title="Trial ends in 3 days"
				description="Add a payment method to avoid losing access to your workspace."
				action={
					<button
						type="button"
						style={{
							background: "white",
							color: "black",
							border: "none",
							padding: "4px 12px",
							borderRadius: "4px",
							cursor: "pointer",
							fontSize: "14px",
							fontWeight: 500,
						}}
					>
						Add payment method
					</button>
				}
			/>
			<div style={{ padding: "var(--space-6)" }}>
				<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
					Dashboard
				</h2>
				<p
					style={{
						marginTop: "var(--space-2)",
						color: "var(--color-muted)",
						fontSize: "0.9375rem",
					}}
				>
					Your product content renders below the banner, which stays pinned to
					the top of the page.
				</p>
			</div>
		</div>
	),
};
