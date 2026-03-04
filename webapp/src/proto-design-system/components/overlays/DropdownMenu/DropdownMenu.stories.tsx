import type { Meta, StoryObj } from "@storybook/react";
import {
	ChevronRight,
	Copy,
	Download,
	Edit,
	ExternalLink,
	Settings,
	Share,
	Star,
	Trash,
	User,
} from "lucide-react";
import { DropdownMenu } from "./DropdownMenu";

const meta: Meta<typeof DropdownMenu> = {
	title: "Composite/DropdownMenu",
	component: DropdownMenu,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "radio",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
	args: {
		items: [
			{ id: "1", label: "Edit", leftIcon: <Edit /> },
			{ id: "2", label: "Duplicate", leftIcon: <Copy /> },
			{ id: "3", label: "Share", leftIcon: <Share /> },
			{ type: "divider" },
			{ id: "4", label: "Delete", leftIcon: <Trash />, state: "disabled" },
		],
	},
};

export const WithShortcuts: Story = {
	args: {
		items: [
			{ id: "1", label: "Undo", shortcut: "Ctrl+Z" },
			{ id: "2", label: "Redo", shortcut: "Ctrl+Y" },
			{ type: "divider" },
			{ id: "3", label: "Cut", shortcut: "Ctrl+X" },
			{ id: "4", label: "Copy", shortcut: "Ctrl+C" },
			{ id: "5", label: "Paste", shortcut: "Ctrl+V" },
		],
	},
};

export const WithCheckboxes: Story = {
	args: {
		items: [
			{ id: "1", label: "Show toolbar", checkbox: true, checked: true },
			{ id: "2", label: "Show sidebar", checkbox: true, checked: true },
			{ id: "3", label: "Show status bar", checkbox: true, checked: false },
			{ type: "divider" },
			{ id: "4", label: "Full screen", checkbox: true, checked: false },
		],
	},
};

export const WithSublabels: Story = {
	args: {
		items: [
			{
				id: "1",
				label: "John Doe",
				sublabel: "john@example.com",
				leftIcon: <User />,
			},
			{
				id: "2",
				label: "Settings",
				sublabel: "Configure your preferences",
				leftIcon: <Settings />,
			},
			{
				id: "3",
				label: "Downloads",
				sublabel: "View downloaded files",
				leftIcon: <Download />,
			},
		],
		size: "lg",
	},
};

export const WithDividerLabels: Story = {
	args: {
		items: [
			{ id: "1", label: "Profile", leftIcon: <User /> },
			{ id: "2", label: "Settings", leftIcon: <Settings /> },
			{ type: "divider", label: "More options" },
			{ id: "3", label: "Star", leftIcon: <Star /> },
			{ id: "4", label: "Share", leftIcon: <Share /> },
		],
	},
};

export const WithActiveState: Story = {
	args: {
		items: [
			{ id: "1", label: "Dashboard", state: "active" },
			{ id: "2", label: "Projects" },
			{ id: "3", label: "Team" },
			{ id: "4", label: "Reports" },
		],
	},
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
			<div>
				<p style={{ marginBottom: "8px", fontWeight: 500 }}>Small</p>
				<DropdownMenu
					size="sm"
					items={[
						{ id: "1", label: "Edit", leftIcon: <Edit /> },
						{ id: "2", label: "Copy", leftIcon: <Copy /> },
						{ id: "3", label: "Delete", leftIcon: <Trash /> },
					]}
				/>
			</div>
			<div>
				<p style={{ marginBottom: "8px", fontWeight: 500 }}>Medium</p>
				<DropdownMenu
					size="md"
					items={[
						{ id: "1", label: "Edit", leftIcon: <Edit /> },
						{ id: "2", label: "Copy", leftIcon: <Copy /> },
						{ id: "3", label: "Delete", leftIcon: <Trash /> },
					]}
				/>
			</div>
			<div>
				<p style={{ marginBottom: "8px", fontWeight: 500 }}>Large</p>
				<DropdownMenu
					size="lg"
					items={[
						{ id: "1", label: "Edit", leftIcon: <Edit /> },
						{ id: "2", label: "Copy", leftIcon: <Copy /> },
						{ id: "3", label: "Delete", leftIcon: <Trash /> },
					]}
				/>
			</div>
		</div>
	),
};

export const WithCaption: Story = {
	args: {
		items: [
			{ id: "1", label: "Learn more", leftIcon: <ExternalLink /> },
			{ id: "2", label: "Documentation", leftIcon: <ExternalLink /> },
			{ id: "3", label: "Contact support", leftIcon: <ExternalLink /> },
		],
		caption: "Links open in a new tab",
	},
};

export const ContextMenu: Story = {
	args: {
		items: [
			{ id: "1", label: "Back", shortcut: "Alt+Left" },
			{ id: "2", label: "Forward", shortcut: "Alt+Right", state: "disabled" },
			{ id: "3", label: "Reload", shortcut: "Ctrl+R" },
			{ type: "divider" },
			{ id: "4", label: "Save as...", shortcut: "Ctrl+S" },
			{ id: "5", label: "Print...", shortcut: "Ctrl+P" },
			{ type: "divider" },
			{ id: "6", label: "View source", shortcut: "Ctrl+U" },
			{ id: "7", label: "Inspect", shortcut: "F12" },
		],
	},
};

export const FileMenu: Story = {
	args: {
		items: [
			{ id: "1", label: "New File", shortcut: "Ctrl+N" },
			{ id: "2", label: "New Window", shortcut: "Ctrl+Shift+N" },
			{ type: "divider" },
			{ id: "3", label: "Open...", shortcut: "Ctrl+O" },
			{ id: "4", label: "Open Recent", rightIcon: <ChevronRight /> },
			{ type: "divider" },
			{ id: "5", label: "Save", shortcut: "Ctrl+S" },
			{ id: "6", label: "Save As...", shortcut: "Ctrl+Shift+S" },
			{ type: "divider" },
			{ id: "7", label: "Close", shortcut: "Ctrl+W" },
		],
	},
};
