import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	AlertTriangle,
	Bug,
	CreditCard,
	Database,
	Globe,
	Lightbulb,
	Server,
	Shield,
	Smartphone,
	Sparkles,
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

const roleItems = [
	{ id: "owner", label: "Owner" },
	{ id: "admin", label: "Admin" },
	{ id: "editor", label: "Editor" },
	{ id: "viewer", label: "Viewer" },
	{ id: "billing", label: "Billing only" },
];

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState<Set<string>>(new Set());
		return <MultiSelect {...args} value={value} onChange={setValue} />;
	},
	args: {
		items: roleItems,
		placeholder: "Assign roles...",
	},
};

export const WithPreselected: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(
			new Set(["admin", "editor"]),
		);
		return (
			<MultiSelect
				items={roleItems}
				value={value}
				onChange={setValue}
				placeholder="Assign roles..."
			/>
		);
	},
};

// =============================================================================
// WITH DESCRIPTIONS
// =============================================================================

export const WithDescriptions: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = [
			{
				id: "billing-updates",
				label: "Billing updates",
				description: "Invoices, failed payments, and plan changes",
				icon: <CreditCard />,
			},
			{
				id: "security-alerts",
				label: "Security alerts",
				description: "New sign-ins and suspicious activity",
				icon: <Shield />,
			},
			{
				id: "product-updates",
				label: "Product updates",
				description: "New features and changelog entries",
				icon: <Sparkles />,
			},
			{
				id: "incident-reports",
				label: "Incident reports",
				description: "Downtime and degraded performance notices",
				icon: <AlertTriangle />,
			},
		];

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select notification types..."
			/>
		);
	},
};

// =============================================================================
// SIZES & VARIANTS
// =============================================================================

export const Sizes: Story = {
	render: () => {
		const [sm, setSm] = useState<Set<string>>(new Set(["owner"]));
		const [md, setMd] = useState<Set<string>>(new Set(["admin", "editor"]));
		const [lg, setLg] = useState<Set<string>>(new Set(["viewer"]));

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
					items={roleItems}
					value={sm}
					onChange={setSm}
					size="sm"
					placeholder="Roles"
				/>
				<MultiSelect
					items={roleItems}
					value={md}
					onChange={setMd}
					size="md"
					placeholder="Roles"
				/>
				<MultiSelect
					items={roleItems}
					value={lg}
					onChange={setLg}
					size="lg"
					placeholder="Roles"
				/>
			</div>
		);
	},
};

export const Variants: Story = {
	render: () => {
		const [def, setDef] = useState<Set<string>>(new Set(["admin"]));
		const [outline, setOutline] = useState<Set<string>>(new Set(["editor"]));

		return (
			<div style={{ display: "flex", gap: "1rem" }}>
				<MultiSelect
					items={roleItems}
					value={def}
					onChange={setDef}
					variant="default"
					placeholder="Default"
				/>
				<MultiSelect
					items={roleItems}
					value={outline}
					onChange={setOutline}
					variant="outline"
					placeholder="Outline"
				/>
			</div>
		);
	},
};

// =============================================================================
// STATES
// =============================================================================

export const WithDisabledItems: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = [
			{ id: "owner", label: "Owner" },
			{
				id: "admin",
				label: "Admin",
				disabled: true,
			},
			{ id: "editor", label: "Editor" },
			{
				id: "billing",
				label: "Billing only",
				disabled: true,
			},
		];

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Assign roles (seat limit reached)..."
			/>
		);
	},
};

export const WithDividers: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const items = [
			{ id: "javascript", label: "JavaScript", icon: <Globe /> },
			{
				id: "python",
				label: "Python",
				icon: <Server />,
				divider: true,
			},
			{ id: "postgres", label: "PostgreSQL", icon: <Database /> },
			{
				id: "ios",
				label: "iOS",
				icon: <Smartphone />,
				divider: true,
			},
			{ id: "security", label: "Security", icon: <Shield /> },
		];

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select repository tags..."
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
					items={roleItems}
					value={value}
					onChange={setValue}
					placeholder="Assign roles..."
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
				items={roleItems}
				value={new Set(["admin", "editor"])}
				placeholder="Assign roles..."
				disabled
			/>
		);
	},
};

export const ManyItems: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(new Set());

		const countries = [
			"United States",
			"Canada",
			"United Kingdom",
			"Germany",
			"France",
			"Spain",
			"Italy",
			"Netherlands",
			"Sweden",
			"Norway",
			"Denmark",
			"Ireland",
			"Australia",
			"New Zealand",
			"Japan",
			"Singapore",
			"India",
			"Brazil",
			"Mexico",
			"South Africa",
		];

		const items = countries.map((country, i) => ({
			id: `country-${i + 1}`,
			label: country,
			description: `Enable billing in ${country}`,
		}));

		return (
			<MultiSelect
				items={items}
				value={value}
				onChange={setValue}
				placeholder="Select supported countries..."
			/>
		);
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => {
		const [value, setValue] = useState<Set<string>>(
			new Set(["billing-updates", "security-alerts"]),
		);

		const items = [
			{
				id: "billing-updates",
				label: "Billing updates",
				description: "Invoices, failed payments, and plan changes",
				icon: <CreditCard />,
			},
			{
				id: "security-alerts",
				label: "Security alerts",
				description: "New sign-ins and suspicious activity",
				icon: <Shield />,
			},
			{
				id: "product-updates",
				label: "Product updates",
				description: "New features and changelog entries",
				icon: <Sparkles />,
				divider: true,
			},
			{
				id: "bug-reports",
				label: "Bug status changes",
				description: "Comments and resolutions on tickets you filed",
				icon: <Bug />,
			},
			{
				id: "feature-requests",
				label: "Feature request votes",
				description: "When a request you upvoted ships",
				icon: <Lightbulb />,
			},
		];

		return (
			<div
				style={{
					width: "320px",
					padding: "1.5rem",
					border: "1px solid var(--color-border)",
					borderRadius: "12px",
					background: "var(--color-surface)",
				}}
			>
				<div style={{ marginBottom: "1rem" }}>
					<div style={{ fontSize: "15px", fontWeight: 600 }}>
						Email notifications
					</div>
					<div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
						Choose what we email you about. You can change this any time.
					</div>
				</div>
				<MultiSelect
					items={items}
					value={value}
					onChange={setValue}
					placeholder="Select notification types..."
					fullWidth
				/>
			</div>
		);
	},
};
