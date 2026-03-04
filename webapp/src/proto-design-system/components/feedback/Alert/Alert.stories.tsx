import type { Meta, StoryObj } from "@storybook/react";
import { Bell } from "lucide-react";
import { Alert } from "./Alert";

const meta: Meta<typeof Alert> = {
	title: "Feedback/Alert",
	component: Alert,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["info", "success", "warning", "error"],
		},
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: "500px" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// VARIANTS
// =============================================================================

export const Info: Story = {
	args: {
		variant: "info",
		title: "Information",
		children: "This is an informational message for the user.",
	},
};

export const Success: Story = {
	args: {
		variant: "success",
		title: "Success",
		children: "Your changes have been saved successfully.",
	},
};

export const Warning: Story = {
	args: {
		variant: "warning",
		title: "Warning",
		children: "Please review your input before proceeding.",
	},
};

export const ErrorVariant: Story = {
	args: {
		variant: "error",
		title: "Error",
		children: "There was a problem processing your request.",
	},
};

// =============================================================================
// OPTIONS
// =============================================================================

export const WithoutTitle: Story = {
	args: {
		variant: "info",
		children: "This is an alert without a title.",
	},
};

export const WithoutIcon: Story = {
	args: {
		variant: "success",
		title: "No Icon",
		icon: false,
		children: "This alert has no icon.",
	},
};

export const CustomIcon: Story = {
	args: {
		variant: "info",
		title: "Notification",
		customIcon: <Bell />,
		children: "You have new notifications.",
	},
};

export const Dismissible: Story = {
	args: {
		variant: "warning",
		title: "Dismissible Alert",
		dismissible: true,
		onDismiss: () => alert("Alert dismissed!"),
		children: "Click the X button to dismiss this alert.",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Alert variant="info" title="Information">
				This is an informational message.
			</Alert>
			<Alert variant="success" title="Success">
				Operation completed successfully.
			</Alert>
			<Alert variant="warning" title="Warning">
				Please proceed with caution.
			</Alert>
			<Alert variant="error" title="Error">
				Something went wrong.
			</Alert>
		</div>
	),
};

export const RealWorldExamples: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Alert variant="success" title="Payment successful" dismissible>
				Your payment of $99.00 has been processed. A confirmation email has been
				sent to your address.
			</Alert>
			<Alert variant="warning" title="Session expiring soon">
				Your session will expire in 5 minutes. Please save your work to avoid
				losing any changes.
			</Alert>
			<Alert variant="error" title="Upload failed" dismissible>
				The file could not be uploaded. Please check your internet connection
				and try again.
			</Alert>
			<Alert variant="info">
				New features are available! Check out our latest update notes.
			</Alert>
		</div>
	),
};
