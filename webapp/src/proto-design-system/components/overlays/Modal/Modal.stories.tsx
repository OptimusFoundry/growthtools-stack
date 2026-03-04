import type { Meta, StoryObj } from "@storybook/react";
import {
	AlertTriangle,
	CheckCircle,
	Info,
	Trash2,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../primitives/Button";
import { Modal } from "./Modal";

const meta: Meta<typeof Modal> = {
	title: "Feedback/Modal",
	component: Modal,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg", "xl", "full"],
		},
		iconVariant: {
			control: "select",
			options: ["default", "success", "warning", "error", "info"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component for interactive stories
const ModalDemo = (props: Partial<React.ComponentProps<typeof Modal>>) => {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setIsOpen(true)}>Open Modal</Button>
			<Modal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				title="Modal Title"
				{...props}
			>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This is the modal content. You can put any content here.
				</p>
			</Modal>
		</>
	);
};

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: () => <ModalDemo />,
};

export const WithDescription: Story = {
	render: () => (
		<ModalDemo
			title="Modal with Description"
			description="This is a helpful description that provides more context about what this modal is for."
		/>
	),
};

export const WithFooter: Story = {
	render: () => (
		<ModalDemo
			footer={
				<>
					<Button variant="outline">Cancel</Button>
					<Button>Confirm</Button>
				</>
			}
		/>
	),
};

export const NoCloseButton: Story = {
	render: () => <ModalDemo showCloseButton={false} />,
};

// =============================================================================
// WITH ICONS
// =============================================================================

export const WithIcon: Story = {
	render: () => (
		<ModalDemo
			icon={<Info />}
			iconVariant="info"
			title="Information"
			description="This is an informational message for the user."
		/>
	),
};

export const SuccessIcon: Story = {
	render: () => (
		<ModalDemo
			icon={<CheckCircle />}
			iconVariant="success"
			title="Success!"
			description="Your changes have been saved successfully."
			footer={<Button>Continue</Button>}
		/>
	),
};

export const WarningIcon: Story = {
	render: () => (
		<ModalDemo
			icon={<AlertTriangle />}
			iconVariant="warning"
			title="Warning"
			description="This action may have unintended consequences."
			footer={
				<>
					<Button variant="outline">Cancel</Button>
					<Button>Proceed Anyway</Button>
				</>
			}
		/>
	),
};

export const ErrorIcon: Story = {
	render: () => (
		<ModalDemo
			icon={<XCircle />}
			iconVariant="error"
			title="Error"
			description="Something went wrong. Please try again."
			footer={<Button>Try Again</Button>}
		/>
	),
};

// =============================================================================
// NON-DISMISSIBLE
// =============================================================================

export const NonDismissible: Story = {
	render: () => {
		const NonDismissibleDemo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button onClick={() => setIsOpen(true)}>
						Open Non-Dismissible Modal
					</Button>
					<Modal
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Required Action"
						description="You must complete this action before continuing. This modal cannot be dismissed by clicking outside or pressing Escape."
						icon={<AlertTriangle />}
						iconVariant="warning"
						dismissible={false}
						size="sm"
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Cancel
								</Button>
								<Button onClick={() => setIsOpen(false)}>Confirm</Button>
							</>
						}
					>
						<p style={{ margin: 0 }}>
							Please confirm that you want to proceed with this action.
						</p>
					</Modal>
				</>
			);
		};
		return <NonDismissibleDemo />;
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	render: () => <ModalDemo size="sm" />,
};

export const Large: Story = {
	render: () => <ModalDemo size="lg" />,
};

export const ExtraLarge: Story = {
	render: () => <ModalDemo size="xl" />,
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const DeleteConfirmation: Story = {
	render: () => {
		const DeleteDemo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button variant="destructive" onClick={() => setIsOpen(true)}>
						Delete Item
					</Button>
					<Modal
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Delete Item"
						description="Are you sure you want to delete this item? This action cannot be undone."
						icon={<Trash2 />}
						iconVariant="error"
						size="sm"
						dismissible={false}
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Cancel
								</Button>
								<Button variant="destructive" onClick={() => setIsOpen(false)}>
									Delete
								</Button>
							</>
						}
					>
						<p style={{ margin: 0 }}>
							This will permanently remove the item and all associated data.
						</p>
					</Modal>
				</>
			);
		};
		return <DeleteDemo />;
	},
};

export const FormModal: Story = {
	render: () => {
		const FormDemo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button onClick={() => setIsOpen(true)}>Create New</Button>
					<Modal
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Create New Item"
						description="Fill in the details below to create a new item."
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Cancel
								</Button>
								<Button onClick={() => setIsOpen(false)}>Create</Button>
							</>
						}
					>
						<div
							style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
						>
							<div>
								<label
									htmlFor="name"
									style={{
										display: "block",
										marginBottom: "0.5rem",
										fontSize: "0.875rem",
										fontWeight: 500,
									}}
								>
									Name
								</label>
								<input
									id="name"
									type="text"
									placeholder="Enter name"
									style={{
										width: "100%",
										padding: "0.5rem 0.75rem",
										border: "1px solid var(--color-border)",
										borderRadius: "var(--radius-md)",
										background: "var(--color-surface)",
										boxSizing: "border-box",
									}}
								/>
							</div>
							<div>
								<label
									htmlFor="description"
									style={{
										display: "block",
										marginBottom: "0.5rem",
										fontSize: "0.875rem",
										fontWeight: 500,
									}}
								>
									Description
								</label>
								<textarea
									id="description"
									rows={3}
									placeholder="Enter description"
									style={{
										width: "100%",
										padding: "0.5rem 0.75rem",
										border: "1px solid var(--color-border)",
										borderRadius: "var(--radius-md)",
										background: "var(--color-surface)",
										resize: "vertical",
										boxSizing: "border-box",
									}}
								/>
							</div>
						</div>
					</Modal>
				</>
			);
		};
		return <FormDemo />;
	},
};

export const SuccessConfirmation: Story = {
	render: () => {
		const SuccessDemo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button onClick={() => setIsOpen(true)}>Show Success</Button>
					<Modal
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Payment Successful"
						description="Your payment has been processed successfully."
						icon={<CheckCircle />}
						iconVariant="success"
						size="sm"
						footer={<Button onClick={() => setIsOpen(false)}>Done</Button>}
					>
						<p style={{ margin: 0 }}>
							A confirmation email has been sent to your registered email
							address.
						</p>
					</Modal>
				</>
			);
		};
		return <SuccessDemo />;
	},
};

// =============================================================================
// REDUCED MOTION
// =============================================================================

/**
 * When the user has reduced motion enabled in their OS settings,
 * the modal opens and closes instantly without animations.
 *
 * To test: Enable "Reduce motion" in your OS accessibility settings.
 * - macOS: System Settings → Accessibility → Display → Reduce motion
 * - Windows: Settings → Ease of Access → Display → Show animations (off)
 */
export const ReducedMotion: Story = {
	render: () => {
		const ReducedMotionDemo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<div>
					<div
						style={{
							marginBottom: "var(--space-4)",
							padding: "var(--space-3)",
							background: "var(--color-info)",
							color: "var(--color-info-content)",
							borderRadius: "var(--radius-md)",
							fontSize: "var(--font-size-sm)",
						}}
					>
						<strong>Reduced Motion Test:</strong> Enable "Reduce motion" in your
						OS accessibility settings to see instant open/close without
						animations.
					</div>
					<Button onClick={() => setIsOpen(true)}>Open Modal</Button>
					<Modal
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Reduced Motion Modal"
						description="This modal respects the user's reduced motion preference."
						icon={<Info />}
						iconVariant="info"
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Cancel
								</Button>
								<Button onClick={() => setIsOpen(false)}>Confirm</Button>
							</>
						}
					>
						<p style={{ margin: 0 }}>
							When reduced motion is enabled, this modal will appear and
							disappear instantly without any scale or fade animations.
						</p>
					</Modal>
				</div>
			);
		};
		return <ReducedMotionDemo />;
	},
};
