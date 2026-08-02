import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { Drawer } from "./Drawer";

const meta: Meta<typeof Drawer> = {
	title: "Overlays/Drawer",
	component: Drawer,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component for interactive drawer stories
const DrawerDemo = (props: Partial<React.ComponentProps<typeof Drawer>>) => {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setIsOpen(true)}>Open Drawer</Button>
			<Drawer
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				title="Drawer Title"
				{...props}
			>
				{props.children ?? (
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						This is the drawer body. Place any content here — forms, details,
						settings panels, and more.
					</p>
				)}
			</Drawer>
		</>
	);
};

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: () => <DrawerDemo />,
};

export const WithDescription: Story = {
	render: () => (
		<DrawerDemo
			title="Settings"
			description="Adjust your preferences for this campaign."
		/>
	),
};

export const WithFooter: Story = {
	render: () => {
		const Demo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button onClick={() => setIsOpen(true)}>Open Drawer</Button>
					<Drawer
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Schedule Post"
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Cancel
								</Button>
								<Button onClick={() => setIsOpen(false)}>Confirm</Button>
							</>
						}
					>
						<p style={{ margin: 0, color: "var(--color-muted)" }}>
							Choose a date and time to schedule your post.
						</p>
					</Drawer>
				</>
			);
		};
		return <Demo />;
	},
};

export const NonDismissible: Story = {
	render: () => {
		const Demo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button onClick={() => setIsOpen(true)}>
						Open (Non-Dismissible)
					</Button>
					<Drawer
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Required Review"
						description="You must complete this form before continuing."
						dismissible={false}
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Cancel
								</Button>
								<Button onClick={() => setIsOpen(false)}>Submit</Button>
							</>
						}
					>
						<p style={{ margin: 0, color: "var(--color-muted)" }}>
							This drawer will not close on backdrop click or Escape — only via
							the buttons below.
						</p>
					</Drawer>
				</>
			);
		};
		return <Demo />;
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	render: () => <DrawerDemo size="sm" title="Small Drawer" />,
};

export const Large: Story = {
	render: () => <DrawerDemo size="lg" title="Large Drawer" />,
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const FilterPanel: Story = {
	render: () => {
		const Demo = () => {
			const [isOpen, setIsOpen] = useState(false);
			return (
				<>
					<Button variant="outline" onClick={() => setIsOpen(true)}>
						Filters
					</Button>
					<Drawer
						isOpen={isOpen}
						onClose={() => setIsOpen(false)}
						title="Filter Results"
						description="Narrow down the list by applying filters."
						size="sm"
						footer={
							<>
								<Button variant="outline" onClick={() => setIsOpen(false)}>
									Reset
								</Button>
								<Button onClick={() => setIsOpen(false)}>Apply</Button>
							</>
						}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "var(--space-4)",
							}}
						>
							{["Active", "Paused", "Draft", "Archived"].map((status) => (
								<label
									key={status}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "var(--space-3)",
										cursor: "pointer",
										fontSize: "var(--font-size-sm)",
									}}
								>
									<input type="checkbox" />
									{status}
								</label>
							))}
						</div>
					</Drawer>
				</>
			);
		};
		return <Demo />;
	},
};
