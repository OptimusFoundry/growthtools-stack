import type { Meta, StoryObj } from "@storybook/react";
import {
	BarChart,
	FileText,
	Home,
	LogOut,
	Moon,
	Plus,
	Search,
	Settings,
	Sun,
	User,
} from "lucide-react";
import { useState } from "react";
import type { CommandItem } from "./CommandPalette";
import { CommandPalette } from "./CommandPalette";

const meta: Meta<typeof CommandPalette> = {
	title: "Navigation/CommandPalette",
	component: CommandPalette,
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

const sampleItems: CommandItem[] = [
	{
		id: "home",
		label: "Go to Home",
		icon: <Home />,
		shortcut: ["⌘", "H"],
		group: "Navigation",
	},
	{
		id: "dashboard",
		label: "Go to Dashboard",
		icon: <BarChart />,
		description: "View your analytics",
		group: "Navigation",
	},
	{ id: "profile", label: "View Profile", icon: <User />, group: "Navigation" },
	{
		id: "new-doc",
		label: "Create New Document",
		icon: <Plus />,
		shortcut: ["⌘", "N"],
		group: "Actions",
	},
	{
		id: "search",
		label: "Search Files",
		icon: <Search />,
		shortcut: ["⌘", "K"],
		group: "Actions",
	},
	{
		id: "settings",
		label: "Open Settings",
		icon: <Settings />,
		shortcut: ["⌘", ","],
		group: "Actions",
	},
	{
		id: "light-mode",
		label: "Switch to Light Mode",
		icon: <Sun />,
		group: "Theme",
	},
	{
		id: "dark-mode",
		label: "Switch to Dark Mode",
		icon: <Moon />,
		group: "Theme",
	},
	{ id: "logout", label: "Log Out", icon: <LogOut />, group: "Account" },
];

function CommandPaletteDemo({
	items = sampleItems,
	...props
}: Partial<React.ComponentProps<typeof CommandPalette>>) {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<div style={{ padding: "2rem" }}>
			<p style={{ marginBottom: "1rem", color: "var(--color-muted)" }}>
				Press{" "}
				<kbd
					style={{
						padding: "0.25rem 0.5rem",
						background: "var(--color-base-100)",
						borderRadius: "4px",
					}}
				>
					⌘K
				</kbd>{" "}
				or click the button to open
			</p>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				style={{
					background: "var(--color-primary)",
					border: "none",
					borderRadius: "var(--radius-md)",
					color: "var(--color-primary-content)",
					cursor: "pointer",
					fontSize: "var(--font-size-sm)",
					fontWeight: 500,
					padding: "0.5rem 1rem",
				}}
			>
				Open Command Palette
			</button>
			<CommandPalette
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				items={items}
				{...props}
			/>
		</div>
	);
}

export const Default: Story = {
	render: () => <CommandPaletteDemo />,
};

export const WithoutGroups: Story = {
	render: () => (
		<CommandPaletteDemo
			items={[
				{ id: "1", label: "Go to Home", icon: <Home /> },
				{ id: "2", label: "View Dashboard", icon: <BarChart /> },
				{
					id: "3",
					label: "Open Settings",
					icon: <Settings />,
					shortcut: ["⌘", ","],
				},
				{
					id: "4",
					label: "Create Document",
					icon: <FileText />,
					shortcut: ["⌘", "N"],
				},
				{ id: "5", label: "Search", icon: <Search />, shortcut: ["⌘", "K"] },
			]}
		/>
	),
};

export const WithDescriptions: Story = {
	render: () => (
		<CommandPaletteDemo
			items={[
				{
					id: "1",
					label: "Dashboard",
					description: "View your analytics and metrics",
					icon: <BarChart />,
				},
				{
					id: "2",
					label: "Settings",
					description: "Manage your account preferences",
					icon: <Settings />,
				},
				{
					id: "3",
					label: "Documents",
					description: "Browse and manage your files",
					icon: <FileText />,
				},
				{
					id: "4",
					label: "Profile",
					description: "Update your personal information",
					icon: <User />,
				},
			]}
		/>
	),
};

export const ManyItems: Story = {
	render: () => (
		<CommandPaletteDemo
			items={Array.from({ length: 20 }, (_, i) => ({
				id: `item-${i}`,
				label: `Command ${i + 1}`,
				description: `Description for command ${i + 1}`,
				icon: <FileText />,
				group:
					i < 5
						? "Recent"
						: i < 10
							? "Actions"
							: i < 15
								? "Navigation"
								: "Other",
			}))}
		/>
	),
};

export const CustomPlaceholder: Story = {
	render: () => (
		<CommandPaletteDemo
			placeholder="Search for actions, pages, or settings..."
			emptyText="No commands match your search"
		/>
	),
};

export const EmptyState: Story = {
	render: () => (
		<CommandPaletteDemo items={[]} emptyText="No commands available" />
	),
};
