import type { Meta, StoryObj } from "@storybook/react-vite";
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
		children: "Bug",
	},
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag variant="default">Backlog</Tag>
			<Tag variant="primary">In progress</Tag>
			<Tag variant="secondary">Design</Tag>
			<Tag variant="success">Done</Tag>
			<Tag variant="warning">Blocked</Tag>
			<Tag variant="error">Bug</Tag>
			<Tag variant="info">Needs review</Tag>
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
			"api",
			"authentication",
			"regression",
			"p1",
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
		const [selected, setSelected] = useState<string[]>(["bug"]);

		const options = [
			{ id: "bug", label: "Bug" },
			{ id: "feature", label: "Feature" },
			{ id: "docs", label: "Docs" },
			{ id: "chore", label: "Chore" },
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
			<Tag leftIcon={<Hash />}>billing</Tag>
			<Tag leftIcon={<Star />} variant="warning">
				Featured
			</Tag>
			<Tag leftIcon={<User />} variant="info">
				Assigned to Priya
			</Tag>
		</div>
	),
};

export const WithAvatar: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag avatar="https://i.pravatar.cc/40?img=5" removable>
				Priya Nair
			</Tag>
			<Tag avatar="https://i.pravatar.cc/40?img=12" removable>
				Marcus Webb
			</Tag>
			<Tag avatar="https://i.pravatar.cc/40?img=47" removable>
				Elena Torres
			</Tag>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
			<Tag disabled>Archived</Tag>
			<Tag disabled removable>
				Locked label
			</Tag>
			<Tag disabled selectable>
				Read-only filter
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
				Resolved
			</Tag>
			<Tag avatar="https://i.pravatar.cc/40?img=23" size="lg" removable>
				Sam Okafor
			</Tag>
		</div>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	name: "Showcase: Support ticket list",
	render: function TicketListExample() {
		const [filters, setFilters] = useState<string[]>(["open"]);

		const statuses = [
			{ id: "open", label: "Open" },
			{ id: "pending", label: "Pending" },
			{ id: "closed", label: "Closed" },
		];

		const toggleFilter = (id: string) => {
			setFilters((prev) =>
				prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
			);
		};

		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1.25rem",
					width: "420px",
				}}
			>
				<div>
					<p
						style={{
							marginBottom: "0.5rem",
							fontSize: "0.875rem",
							color: "var(--color-muted)",
						}}
					>
						Filter by status
					</p>
					<div style={{ display: "flex", gap: "8px" }}>
						{statuses.map((status) => (
							<Tag
								key={status.id}
								selectable
								selected={filters.includes(status.id)}
								onSelectChange={() => toggleFilter(status.id)}
							>
								{status.label}
							</Tag>
						))}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.75rem",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "0.75rem",
							border: "1px solid var(--color-border)",
							borderRadius: "var(--radius-md)",
						}}
					>
						<span>Checkout fails on Safari 17</span>
						<div style={{ display: "flex", gap: "6px" }}>
							<Tag variant="error" size="sm" leftIcon={<Hash />}>
								bug
							</Tag>
							<Tag avatar="https://i.pravatar.cc/40?img=5" size="sm">
								Priya
							</Tag>
						</div>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "0.75rem",
							border: "1px solid var(--color-border)",
							borderRadius: "var(--radius-md)",
						}}
					>
						<span>Add CSV export to invoices</span>
						<div style={{ display: "flex", gap: "6px" }}>
							<Tag variant="info" size="sm" leftIcon={<Hash />}>
								feature
							</Tag>
							<Tag avatar="https://i.pravatar.cc/40?img=12" size="sm">
								Marcus
							</Tag>
						</div>
					</div>
				</div>
			</div>
		);
	},
	parameters: {
		layout: "padded",
	},
};
