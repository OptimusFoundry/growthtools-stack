import type { Meta, StoryObj } from "@storybook/react-vite";
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
		title: "New comment",
		children: "Priya mentioned you on the Q3 roadmap doc.",
	},
};

export const Success: Story = {
	args: {
		variant: "success",
		title: "Changes saved",
		children: "Your billing details have been updated.",
	},
};

export const Warning: Story = {
	args: {
		variant: "warning",
		title: "Session expiring",
		children: "You'll be signed out in 5 minutes due to inactivity.",
	},
};

export const ErrorVariant: Story = {
	args: {
		variant: "error",
		title: "Save failed",
		children: "Could not update your workspace name. Please try again.",
	},
};

// =============================================================================
// OPTIONS
// =============================================================================

export const WithoutTitle: Story = {
	args: {
		children: "Preferences updated.",
	},
};

export const NotClosable: Story = {
	args: {
		title: "Deploying to production",
		closable: false,
		children: "Build #482 is being deployed. This usually takes 2 minutes.",
	},
};

export const WithAction: Story = {
	args: {
		title: "Invoice deleted",
		children: "Draft invoice #INV-1042 has been removed.",
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
			<Toast variant="default" title="New comment">
				Priya mentioned you on the Q3 roadmap doc.
			</Toast>
			<Toast variant="success" title="Payment successful">
				Your subscription has been renewed.
			</Toast>
			<Toast variant="warning" title="Approaching plan limit">
				You've used 90% of your monthly API quota.
			</Toast>
			<Toast variant="error" title="Export failed">
				The report could not be generated. Please try again.
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
				<Toast variant="success" title="Invite sent">
					An invitation was sent to jordan@acme.com.
				</Toast>
				<Toast variant="default" title="New message">
					You have a new message from the support team.
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
				title="Payment successful"
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
						View receipt
					</button>
				}
			>
				Your payment of $49.00 for the Growth plan was processed.
			</Toast>
			<Toast variant="error" title="Connection lost">
				Unable to reach the server. Retrying in the background...
			</Toast>
			<Toast variant="warning" title="Storage almost full">
				You've used 90% of your 50 GB storage quota.
			</Toast>
		</div>
	),
};

export const FormSubmitStack: Story = {
	name: "Showcase — Toasts After Form Submit",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Toast variant="success" title="Profile updated">
				Your display name and avatar have been saved.
			</Toast>
			<Toast
				variant="warning"
				title="Email not verified"
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
						Resend
					</button>
				}
			>
				Verify your new email address to keep receiving billing alerts.
			</Toast>
		</div>
	),
};
