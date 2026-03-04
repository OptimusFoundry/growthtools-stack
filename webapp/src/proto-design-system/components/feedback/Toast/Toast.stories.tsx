import type { Meta, StoryObj } from "@storybook/react";
import { Toast, ToastContainer } from "./Toast";

const meta: Meta<typeof Toast> = {
	title: "Feedback/Toast",
	component: Toast,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "success", "warning", "error"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// VARIANTS
// =============================================================================

export const Default: Story = {
	args: {
		title: "Notification",
		children: "This is a default toast notification.",
	},
};

export const Success: Story = {
	args: {
		variant: "success",
		title: "Success",
		children: "Your changes have been saved.",
	},
};

export const Warning: Story = {
	args: {
		variant: "warning",
		title: "Warning",
		children: "Your session is about to expire.",
	},
};

export const ErrorVariant: Story = {
	args: {
		variant: "error",
		title: "Error",
		children: "Failed to save changes. Please try again.",
	},
};

// =============================================================================
// OPTIONS
// =============================================================================

export const WithoutTitle: Story = {
	args: {
		children: "This is a toast without a title.",
	},
};

export const NotClosable: Story = {
	args: {
		title: "Processing",
		closable: false,
		children: "Please wait while we process your request...",
	},
};

export const WithAction: Story = {
	args: {
		title: "File deleted",
		children: "The file has been moved to trash.",
		action: (
			<button
				type="button"
				style={{
					background: "none",
					border: "none",
					color: "var(--color-primary)",
					cursor: "pointer",
					fontWeight: 600,
					fontSize: "0.875rem",
				}}
			>
				Undo
			</button>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllVariants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Toast variant="default" title="Info">
				Default notification message.
			</Toast>
			<Toast variant="success" title="Success">
				Operation completed successfully.
			</Toast>
			<Toast variant="warning" title="Warning">
				Please review before continuing.
			</Toast>
			<Toast variant="error" title="Error">
				Something went wrong.
			</Toast>
		</div>
	),
};

export const InContainer: Story = {
	render: () => (
		<div
			style={{
				position: "relative",
				width: "100vw",
				height: "400px",
				background: "var(--color-base-100)",
			}}
		>
			<ToastContainer position="bottom-right">
				<Toast variant="success" title="Saved">
					Your document has been saved.
				</Toast>
				<Toast variant="default" title="New message">
					You have a new message from John.
				</Toast>
			</ToastContainer>
		</div>
	),
	parameters: {
		layout: "fullscreen",
	},
};

export const RealWorldExamples: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Toast
				variant="success"
				title="Email sent"
				action={
					<button
						type="button"
						style={{
							background: "none",
							border: "none",
							color: "var(--color-primary)",
							cursor: "pointer",
							fontWeight: 600,
							fontSize: "0.875rem",
						}}
					>
						View
					</button>
				}
			>
				Your email has been sent successfully.
			</Toast>
			<Toast variant="error" title="Connection lost">
				Unable to connect to the server. Retrying...
			</Toast>
			<Toast variant="warning" title="Storage almost full">
				You have used 90% of your storage quota.
			</Toast>
		</div>
	),
};
