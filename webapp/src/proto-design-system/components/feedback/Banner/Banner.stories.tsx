import type { Meta, StoryObj } from "@storybook/react";
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
			"A new version of this application is available. Refresh to update.",
	},
};

export const FilledVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<Banner
				type="info"
				variant="filled"
				title="Info banner"
				description="This is an informational message"
			/>
			<Banner
				type="success"
				variant="filled"
				title="Success!"
				description="Your changes have been saved"
			/>
			<Banner
				type="warning"
				variant="filled"
				title="Warning"
				description="This action cannot be undone"
			/>
			<Banner
				type="error"
				variant="filled"
				title="Error"
				description="Something went wrong"
			/>
			<Banner
				type="feature"
				variant="filled"
				title="New feature"
				description="Check out our latest update"
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
				title="Info banner"
				description="This is an informational message"
			/>
			<Banner
				type="success"
				variant="light"
				title="Success!"
				description="Your changes have been saved"
			/>
			<Banner
				type="warning"
				variant="light"
				title="Warning"
				description="This action cannot be undone"
			/>
			<Banner
				type="error"
				variant="light"
				title="Error"
				description="Something went wrong"
			/>
			<Banner
				type="feature"
				variant="light"
				title="New feature"
				description="Check out our latest update"
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
				title="Info banner"
				description="This is an informational message"
			/>
			<Banner
				type="success"
				variant="lighter"
				title="Success!"
				description="Your changes have been saved"
			/>
			<Banner
				type="warning"
				variant="lighter"
				title="Warning"
				description="This action cannot be undone"
			/>
			<Banner
				type="error"
				variant="lighter"
				title="Error"
				description="Something went wrong"
			/>
			<Banner
				type="feature"
				variant="lighter"
				title="New feature"
				description="Check out our latest update"
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
				title="Info banner"
				description="This is an informational message"
			/>
			<Banner
				type="success"
				variant="stroke"
				title="Success!"
				description="Your changes have been saved"
			/>
			<Banner
				type="warning"
				variant="stroke"
				title="Warning"
				description="This action cannot be undone"
			/>
			<Banner
				type="error"
				variant="stroke"
				title="Error"
				description="Something went wrong"
			/>
			<Banner
				type="feature"
				variant="stroke"
				title="New feature"
				description="Check out our latest update"
			/>
		</div>
	),
};

export const WithAction: Story = {
	args: {
		type: "feature",
		variant: "filled",
		title: "Upgrade to Pro",
		description: "Get access to exclusive features",
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
		description: "The system will be unavailable on Sunday from 2-4 AM",
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
