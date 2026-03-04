import type { Meta, StoryObj } from "@storybook/react";
import { Hash, Star, User } from "lucide-react";
import { useState } from "react";
import { Tag } from "./Tag";

const meta: Meta<typeof Tag> = {
	title: "Primitives/Tag",
	component: Tag,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"primary",
				"secondary",
				"success",
				"warning",
				"error",
				"info",
			],
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {
	args: {
		children: "Tag Label",
	},
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag variant="default">Default</Tag>
			<Tag variant="primary">Primary</Tag>
			<Tag variant="secondary">Secondary</Tag>
			<Tag variant="success">Success</Tag>
			<Tag variant="warning">Warning</Tag>
			<Tag variant="error">Error</Tag>
			<Tag variant="info">Info</Tag>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
			<Tag size="sm">Small</Tag>
			<Tag size="md">Medium</Tag>
			<Tag size="lg">Large</Tag>
		</div>
	),
};

export const Removable: Story = {
	render: function RemovableExample() {
		const [tags, setTags] = useState([
			"React",
			"TypeScript",
			"SCSS",
			"Design System",
		]);

		return (
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
				{tags.map((tag) => (
					<Tag
						key={tag}
						removable
						onRemove={() => setTags(tags.filter((t) => t !== tag))}
					>
						{tag}
					</Tag>
				))}
			</div>
		);
	},
};

export const Selectable: Story = {
	render: function SelectableExample() {
		const [selected, setSelected] = useState<string[]>(["react"]);

		const options = [
			{ id: "react", label: "React" },
			{ id: "vue", label: "Vue" },
			{ id: "angular", label: "Angular" },
			{ id: "svelte", label: "Svelte" },
		];

		const toggleSelection = (id: string) => {
			setSelected((prev) =>
				prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
			);
		};

		return (
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
				{options.map((option) => (
					<Tag
						key={option.id}
						selectable
						selected={selected.includes(option.id)}
						onSelectChange={() => toggleSelection(option.id)}
					>
						{option.label}
					</Tag>
				))}
			</div>
		);
	},
};

export const WithIcon: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag leftIcon={<Hash />}>Category</Tag>
			<Tag leftIcon={<Star />} variant="warning">
				Featured
			</Tag>
			<Tag leftIcon={<User />} variant="info">
				Assigned
			</Tag>
		</div>
	),
};

export const WithAvatar: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag avatar="https://i.pravatar.cc/40?img=1" removable>
				John Doe
			</Tag>
			<Tag avatar="https://i.pravatar.cc/40?img=2" removable>
				Jane Smith
			</Tag>
			<Tag avatar="https://i.pravatar.cc/40?img=3" removable>
				Bob Johnson
			</Tag>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag disabled>Disabled</Tag>
			<Tag disabled removable>
				Disabled Removable
			</Tag>
			<Tag disabled selectable>
				Disabled Selectable
			</Tag>
		</div>
	),
};

export const Combined: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag variant="primary" removable leftIcon={<Star />}>
				Priority
			</Tag>
			<Tag variant="success" size="sm" removable>
				Completed
			</Tag>
			<Tag avatar="https://i.pravatar.cc/40?img=4" size="lg" removable>
				Team Member
			</Tag>
		</div>
	),
};
