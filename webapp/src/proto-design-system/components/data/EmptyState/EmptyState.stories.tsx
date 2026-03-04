import type { Meta, StoryObj } from "@storybook/react";
import { FileQuestion, Inbox, Plus, Search, Upload, Users } from "lucide-react";
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
	title: "Data/EmptyState",
	component: EmptyState,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

const PrimaryButton = ({ children }: { children: React.ReactNode }) => (
	<button
		type="button"
		style={{
			background: "var(--color-primary)",
			border: "none",
			borderRadius: "var(--radius-md)",
			color: "var(--color-primary-content)",
			cursor: "pointer",
			fontSize: "var(--font-size-sm)",
			fontWeight: 500,
			padding: "0.5rem 1rem",
			display: "inline-flex",
			alignItems: "center",
			gap: "0.5rem",
		}}
	>
		{children}
	</button>
);

const SecondaryButton = ({ children }: { children: React.ReactNode }) => (
	<button
		type="button"
		style={{
			background: "transparent",
			border: "1px solid var(--color-border)",
			borderRadius: "var(--radius-md)",
			color: "var(--color-base-content)",
			cursor: "pointer",
			fontSize: "var(--font-size-sm)",
			fontWeight: 500,
			padding: "0.5rem 1rem",
		}}
	>
		{children}
	</button>
);

export const Default: Story = {
	args: {
		title: "No messages",
		description: "You don't have any messages yet. Start a conversation!",
		icon: <Inbox />,
	},
};

export const WithAction: Story = {
	args: {
		title: "No projects",
		description: "Get started by creating your first project.",
		icon: <FileQuestion />,
		action: (
			<PrimaryButton>
				<Plus size={16} /> Create Project
			</PrimaryButton>
		),
	},
};

export const WithMultipleActions: Story = {
	args: {
		title: "No team members",
		description: "Invite your colleagues to collaborate on this project.",
		icon: <Users />,
		action: <PrimaryButton>Invite Members</PrimaryButton>,
		secondaryAction: <SecondaryButton>Learn More</SecondaryButton>,
	},
};

export const SearchNoResults: Story = {
	args: {
		title: "No results found",
		description:
			"Try adjusting your search or filter to find what you're looking for.",
		icon: <Search />,
		action: <SecondaryButton>Clear Filters</SecondaryButton>,
	},
};

export const FileUpload: Story = {
	args: {
		title: "No files uploaded",
		description: "Drag and drop files here, or click to browse.",
		icon: <Upload />,
		action: <PrimaryButton>Browse Files</PrimaryButton>,
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		title: "No items",
		description: "Add items to get started.",
		icon: <Inbox />,
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		title: "Welcome to your dashboard",
		description:
			"This is where you'll see all your important data and insights. Let's start by setting up your first report.",
		icon: <FileQuestion />,
		action: <PrimaryButton>Get Started</PrimaryButton>,
	},
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
			<div
				style={{
					border: "1px dashed var(--color-border)",
					borderRadius: "var(--radius-lg)",
				}}
			>
				<EmptyState
					size="sm"
					title="Small"
					description="A small empty state"
					icon={<Inbox />}
				/>
			</div>
			<div
				style={{
					border: "1px dashed var(--color-border)",
					borderRadius: "var(--radius-lg)",
				}}
			>
				<EmptyState
					size="md"
					title="Medium (Default)"
					description="A medium empty state"
					icon={<Inbox />}
				/>
			</div>
			<div
				style={{
					border: "1px dashed var(--color-border)",
					borderRadius: "var(--radius-lg)",
				}}
			>
				<EmptyState
					size="lg"
					title="Large"
					description="A large empty state"
					icon={<Inbox />}
				/>
			</div>
		</div>
	),
};

export const CustomIcon: Story = {
	args: {
		title: "Custom illustration",
		description: "You can use any icon or illustration here.",
		icon: (
			<div
				style={{
					width: "80px",
					height: "80px",
					borderRadius: "var(--radius-full)",
					background: "var(--color-primary-100)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Inbox size={40} color="var(--color-primary)" />
			</div>
		),
	},
};

export const NoIcon: Story = {
	args: {
		title: "Simple empty state",
		description: "Sometimes you just need text without an icon.",
		icon: null,
		action: <PrimaryButton>Take Action</PrimaryButton>,
	},
};
