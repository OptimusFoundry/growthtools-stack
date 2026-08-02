import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, FileText, Pause, Play } from "lucide-react";
import { useState } from "react";
import { FilterTabs } from "./FilterTabs";

const meta: Meta<typeof FilterTabs> = {
	title: "Data/FilterTabs",
	component: FilterTabs,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const STATUS_ITEMS = [
	{ id: "all", label: "All", count: 12 },
	{ id: "active", label: "Active", count: 4 },
	{ id: "paused", label: "Paused", count: 3 },
	{ id: "draft", label: "Draft", count: 5 },
];

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState("all");
			return (
				<FilterTabs
					items={STATUS_ITEMS}
					value={value}
					onChange={setValue}
					aria-label="Filter by status"
				/>
			);
		};
		return <Demo />;
	},
};

export const WithIcons: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState("all");
			return (
				<FilterTabs
					items={[
						{
							id: "all",
							label: "All",
							count: 12,
							icon: <FileText size={14} />,
						},
						{
							id: "active",
							label: "Active",
							count: 4,
							icon: <Play size={14} />,
						},
						{
							id: "paused",
							label: "Paused",
							count: 3,
							icon: <Pause size={14} />,
						},
						{
							id: "archived",
							label: "Archived",
							count: 5,
							icon: <Archive size={14} />,
						},
					]}
					value={value}
					onChange={setValue}
					aria-label="Filter by status"
				/>
			);
		};
		return <Demo />;
	},
};

export const WithoutCounts: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState("all");
			return (
				<FilterTabs
					items={[
						{ id: "all", label: "All" },
						{ id: "active", label: "Active" },
						{ id: "paused", label: "Paused" },
						{ id: "draft", label: "Draft" },
					]}
					value={value}
					onChange={setValue}
					aria-label="Filter by status"
				/>
			);
		};
		return <Demo />;
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const SizeSm: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState("all");
			return (
				<FilterTabs
					items={STATUS_ITEMS}
					value={value}
					onChange={setValue}
					size="sm"
					aria-label="Filter by status (small)"
				/>
			);
		};
		return <Demo />;
	},
};

export const SizeMd: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState("all");
			return (
				<FilterTabs
					items={STATUS_ITEMS}
					value={value}
					onChange={setValue}
					size="md"
					aria-label="Filter by status (medium)"
				/>
			);
		};
		return <Demo />;
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const CampaignFilter: Story = {
	render: () => {
		const Demo = () => {
			const [filter, setFilter] = useState("all");
			const campaigns = [
				{ id: 1, name: "Early Access Beta", status: "active" },
				{ id: 2, name: "Product Hunt Launch", status: "draft" },
				{ id: 3, name: "Summer Waitlist", status: "paused" },
				{ id: 4, name: "Newsletter Signups", status: "active" },
			];

			const filtered =
				filter === "all"
					? campaigns
					: campaigns.filter((c) => c.status === filter);

			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-4)",
						width: "360px",
					}}
				>
					<FilterTabs
						items={STATUS_ITEMS}
						value={filter}
						onChange={setFilter}
						aria-label="Filter campaigns"
					/>
					<ul
						style={{
							listStyle: "none",
							margin: 0,
							padding: 0,
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-2)",
						}}
					>
						{filtered.map((c) => (
							<li
								key={c.id}
								style={{
									padding: "var(--space-3) var(--space-4)",
									border: "1px solid var(--color-border)",
									borderRadius: "var(--radius-md)",
									fontSize: "var(--font-size-sm)",
									display: "flex",
									justifyContent: "space-between",
								}}
							>
								<span>{c.name}</span>
								<span style={{ color: "var(--color-muted)" }}>{c.status}</span>
							</li>
						))}
					</ul>
				</div>
			);
		};
		return <Demo />;
	},
};
