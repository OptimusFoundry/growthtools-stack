import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ArrowDownAZ,
	ArrowUpAZ,
	Clock,
	Copy,
	Download,
	Edit,
	LogOut,
	Settings,
	Share,
	Trash2,
	User,
} from "lucide-react";
import { useState } from "react";
import { Dropdown } from "./Dropdown";

const meta: Meta<typeof Dropdown> = {
	title: "Composite/Dropdown",
	component: Dropdown,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "outline", "ghost"],
		},
		align: {
			control: "select",
			options: ["start", "end"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const documentActions = [
	{ id: "edit", label: "Edit", icon: <Edit /> },
	{ id: "copy", label: "Duplicate", icon: <Copy /> },
	{ id: "share", label: "Share", icon: <Share /> },
	{ id: "download", label: "Download", icon: <Download />, divider: true },
	{ id: "delete", label: "Delete", icon: <Trash2 />, danger: true },
];

const roleItems = [
	{ id: "viewer", label: "Viewer" },
	{ id: "editor", label: "Editor" },
	{ id: "admin", label: "Admin" },
];

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState<string | undefined>();
		return <Dropdown {...args} value={value} onChange={setValue} />;
	},
	args: {
		items: documentActions,
		placeholder: "Select action...",
	},
};

export const WithIcons: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>("edit");
		return (
			<Dropdown
				items={documentActions}
				value={value}
				onChange={setValue}
				placeholder="Select action..."
			/>
		);
	},
};

export const Sizes: Story = {
	render: () => {
		const [sm, setSm] = useState<string | undefined>();
		const [md, setMd] = useState<string | undefined>();
		const [lg, setLg] = useState<string | undefined>();

		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
					alignItems: "flex-start",
				}}
			>
				<Dropdown
					items={roleItems}
					value={sm}
					onChange={setSm}
					size="sm"
					placeholder="Role"
				/>
				<Dropdown
					items={roleItems}
					value={md}
					onChange={setMd}
					size="md"
					placeholder="Role"
				/>
				<Dropdown
					items={roleItems}
					value={lg}
					onChange={setLg}
					size="lg"
					placeholder="Role"
				/>
			</div>
		);
	},
};

export const Variants: Story = {
	render: () => {
		const [def, setDef] = useState<string | undefined>();
		const [outline, setOutline] = useState<string | undefined>();
		const [ghost, setGhost] = useState<string | undefined>();

		return (
			<div style={{ display: "flex", gap: "1rem" }}>
				<Dropdown
					items={roleItems}
					value={def}
					onChange={setDef}
					variant="default"
					placeholder="Default"
				/>
				<Dropdown
					items={roleItems}
					value={outline}
					onChange={setOutline}
					variant="outline"
					placeholder="Outline"
				/>
				<Dropdown
					items={roleItems}
					value={ghost}
					onChange={setGhost}
					variant="ghost"
					placeholder="Ghost"
				/>
			</div>
		);
	},
};

export const WithDisabledItems: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>();

		const items = [
			{ id: "edit", label: "Edit", icon: <Edit /> },
			{ id: "copy", label: "Duplicate", icon: <Copy />, disabled: true },
			{ id: "share", label: "Share", icon: <Share /> },
			{ id: "download", label: "Download", icon: <Download />, disabled: true },
		];

		return (
			<Dropdown
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select action..."
			/>
		);
	},
};

export const WithDividers: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>();

		const items = [
			{ id: "profile", label: "Profile", icon: <User /> },
			{ id: "settings", label: "Settings", icon: <Settings />, divider: true },
			{ id: "logout", label: "Log out", icon: <LogOut />, danger: true },
		];

		return (
			<Dropdown
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Account"
			/>
		);
	},
};

export const FullWidth: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>();

		const sortItems = [
			{ id: "newest", label: "Newest first", icon: <Clock /> },
			{ id: "oldest", label: "Oldest first", icon: <Clock /> },
			{ id: "az", label: "Name A-Z", icon: <ArrowDownAZ /> },
			{ id: "za", label: "Name Z-A", icon: <ArrowUpAZ /> },
		];

		return (
			<div style={{ width: "300px" }}>
				<Dropdown
					items={sortItems}
					value={value}
					onChange={setValue}
					placeholder="Sort by..."
					fullWidth
				/>
			</div>
		);
	},
};

export const AlignEnd: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>();

		return (
			<div
				style={{ display: "flex", justifyContent: "flex-end", width: "400px" }}
			>
				<Dropdown
					items={documentActions}
					value={value}
					onChange={setValue}
					placeholder="Actions"
					align="end"
				/>
			</div>
		);
	},
};

export const Disabled: Story = {
	render: () => {
		const items = [
			{ id: "edit", label: "Edit" },
			{ id: "copy", label: "Duplicate" },
		];

		return <Dropdown items={items} placeholder="Select action..." disabled />;
	},
};

export const WithDescriptions: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>();

		const items = [
			{
				id: "personal",
				label: "Personal",
				description: "Your personal workspace",
				icon: <User />,
			},
			{
				id: "team",
				label: "Team",
				description: "Shared with your team members",
				icon: <Settings />,
			},
			{
				id: "public",
				label: "Public",
				description: "Anyone can view this",
				icon: <Share />,
			},
		];

		return (
			<Dropdown
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select workspace..."
			/>
		);
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => {
		const [sort, setSort] = useState<string | undefined>("newest");
		const [rowAction, setRowAction] = useState<string | undefined>();

		const sortItems = [
			{ id: "newest", label: "Newest first", icon: <Clock /> },
			{ id: "oldest", label: "Oldest first", icon: <Clock /> },
			{ id: "az", label: "Name A-Z", icon: <ArrowDownAZ /> },
		];

		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
					width: "360px",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-md)",
					padding: "1rem",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<strong>Invoices</strong>
					<Dropdown
						items={sortItems}
						value={sort}
						onChange={setSort}
						size="sm"
					/>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "0.5rem 0",
						borderTop: "1px solid var(--color-border)",
					}}
				>
					<span>Invoice #2049 — Acme Corp</span>
					<Dropdown
						items={documentActions}
						value={rowAction}
						onChange={setRowAction}
						variant="ghost"
						size="sm"
						align="end"
						placeholder="Actions"
					/>
				</div>
			</div>
		);
	},
};
