import type { Meta, StoryObj } from "@storybook/react";
import {
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

const basicItems = [
	{ id: "edit", label: "Edit", icon: <Edit /> },
	{ id: "copy", label: "Copy", icon: <Copy /> },
	{ id: "share", label: "Share", icon: <Share /> },
	{ id: "download", label: "Download", icon: <Download />, divider: true },
	{ id: "delete", label: "Delete", icon: <Trash2 />, danger: true },
];

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState<string | undefined>();
		return <Dropdown {...args} value={value} onChange={setValue} />;
	},
	args: {
		items: basicItems,
		placeholder: "Select action...",
	},
};

export const WithIcons: Story = {
	render: () => {
		const [value, setValue] = useState<string | undefined>("edit");
		return (
			<Dropdown
				items={basicItems}
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

		const items = [
			{ id: "option1", label: "Option 1" },
			{ id: "option2", label: "Option 2" },
			{ id: "option3", label: "Option 3" },
		];

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
					items={items}
					value={sm}
					onChange={setSm}
					size="sm"
					placeholder="Small"
				/>
				<Dropdown
					items={items}
					value={md}
					onChange={setMd}
					size="md"
					placeholder="Medium"
				/>
				<Dropdown
					items={items}
					value={lg}
					onChange={setLg}
					size="lg"
					placeholder="Large"
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

		const items = [
			{ id: "option1", label: "Option 1" },
			{ id: "option2", label: "Option 2" },
			{ id: "option3", label: "Option 3" },
		];

		return (
			<div style={{ display: "flex", gap: "1rem" }}>
				<Dropdown
					items={items}
					value={def}
					onChange={setDef}
					variant="default"
					placeholder="Default"
				/>
				<Dropdown
					items={items}
					value={outline}
					onChange={setOutline}
					variant="outline"
					placeholder="Outline"
				/>
				<Dropdown
					items={items}
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
			{ id: "copy", label: "Copy", icon: <Copy />, disabled: true },
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

		const items = [
			{ id: "option1", label: "Option 1" },
			{ id: "option2", label: "Option 2" },
			{ id: "option3", label: "Option 3" },
		];

		return (
			<div style={{ width: "300px" }}>
				<Dropdown
					items={items}
					value={value}
					onChange={setValue}
					placeholder="Select option..."
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
					items={basicItems}
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
			{ id: "option1", label: "Option 1" },
			{ id: "option2", label: "Option 2" },
		];

		return <Dropdown items={items} placeholder="Disabled dropdown" disabled />;
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
