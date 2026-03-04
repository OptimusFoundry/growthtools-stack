import type { Meta, StoryObj } from "@storybook/react";
import {
	Code,
	Database,
	Globe,
	Layers,
	Server,
	Settings,
	Smartphone,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { MultiSelect } from "./MultiSelect";

const meta: Meta<typeof MultiSelect> = {
	title: "Composite/MultiSelect",
	component: MultiSelect,
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
			options: ["default", "outline"],
		},
		align: {
			control: "select",
			options: ["start", "end"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

const frameworkItems = [
	{ id: "react", label: "React", icon: <Code /> },
	{ id: "vue", label: "Vue", icon: <Code /> },
	{ id: "angular", label: "Angular", icon: <Code /> },
	{ id: "svelte", label: "Svelte", icon: <Code /> },
	{ id: "solid", label: "Solid", icon: <Code /> },
];

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState<Set<string>>(new Set());
		return <MultiSelect {...args} value={value} onChange={setValue} />;
	},
	args: {
		items: frameworkItems,
		placeholder: "Select frameworks...",
	},
};

export const WithPreselected: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set(["react", "vue"]));
		return (
			<MultiSelect
				items={frameworkItems}
				value={value}
				onChange={setValue}
				placeholder="Select frameworks..."
			/>
		);
	},
};

export const WithDescriptions: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = [
			{
				id: "frontend",
				label: "Frontend",
				description: "User interface development",
				icon: <Globe />,
			},
			{
				id: "backend",
				label: "Backend",
				description: "Server-side logic and APIs",
				icon: <Server />,
			},
			{
				id: "database",
				label: "Database",
				description: "Data storage and management",
				icon: <Database />,
			},
			{
				id: "mobile",
				label: "Mobile",
				description: "iOS and Android development",
				icon: <Smartphone />,
			},
		];

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select specializations..."
			/>
		);
	},
};

export const Sizes: Story = {
	render: () => {
		const [sm, setSm] = useState<Set<string>>(new Set(["react"]));
		const [md, setMd] = useState<Set<string>>(new Set(["react", "vue"]));
		const [lg, setLg] = useState<Set<string>>(new Set(["react"]));

		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
					alignItems: "flex-start",
				}}
			>
				<MultiSelect
					items={frameworkItems}
					value={sm}
					onChange={setSm}
					size="sm"
					placeholder="Small"
				/>
				<MultiSelect
					items={frameworkItems}
					value={md}
					onChange={setMd}
					size="md"
					placeholder="Medium"
				/>
				<MultiSelect
					items={frameworkItems}
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
		const [def, setDef] = useState<Set<string>>(new Set(["react"]));
		const [outline, setOutline] = useState<Set<string>>(new Set(["vue"]));

		return (
			<div style={{ display: "flex", gap: "1rem" }}>
				<MultiSelect
					items={frameworkItems}
					value={def}
					onChange={setDef}
					variant="default"
					placeholder="Default"
				/>
				<MultiSelect
					items={frameworkItems}
					value={outline}
					onChange={setOutline}
					variant="outline"
					placeholder="Outline"
				/>
			</div>
		);
	},
};

export const WithDisabledItems: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = [
			{ id: "react", label: "React", icon: <Code /> },
			{ id: "vue", label: "Vue", icon: <Code />, disabled: true },
			{ id: "angular", label: "Angular", icon: <Code /> },
			{ id: "svelte", label: "Svelte", icon: <Code />, disabled: true },
		];

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select frameworks..."
			/>
		);
	},
};

export const WithDividers: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = [
			{ id: "frontend", label: "Frontend", icon: <Globe /> },
			{ id: "backend", label: "Backend", icon: <Server />, divider: true },
			{ id: "devops", label: "DevOps", icon: <Settings /> },
			{ id: "performance", label: "Performance", icon: <Zap />, divider: true },
			{ id: "architecture", label: "Architecture", icon: <Layers /> },
		];

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select skills..."
			/>
		);
	},
};

export const FullWidth: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		return (
			<div style={{ width: "400px" }}>
				<MultiSelect
					items={frameworkItems}
					value={value}
					onChange={setValue}
					placeholder="Select frameworks..."
					fullWidth
				/>
			</div>
		);
	},
};

export const Disabled: Story = {
	render: () => {
		return (
			<MultiSelect
				items={frameworkItems}
				value={new Set(["react", "vue"])}
				placeholder="Disabled multiselect"
				disabled
			/>
		);
	},
};

export const ManyItems: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = Array.from({ length: 20 }, (_, i) => ({
			id: `item-${i + 1}`,
			label: `Option ${i + 1}`,
			description: `Description for option ${i + 1}`,
		}));

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select options..."
			/>
		);
	},
};
