import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

const countries = [
	{ value: "us", label: "United States" },
	{ value: "uk", label: "United Kingdom" },
	{ value: "ca", label: "Canada" },
	{ value: "au", label: "Australia" },
	{ value: "de", label: "Germany" },
	{ value: "fr", label: "France" },
];

const meta: Meta<typeof Select> = {
	title: "Forms/Select",
	component: Select,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "filled"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		options: countries,
		placeholder: "Select a country",
	},
};

export const WithLabel: Story = {
	args: {
		label: "Billing country",
		options: countries,
		placeholder: "Select a country",
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Billing country",
		options: countries,
		placeholder: "Select a country",
		helperText: "Used to calculate applicable tax",
	},
};

export const WithValue: Story = {
	args: {
		label: "Billing country",
		options: countries,
		defaultValue: "uk",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Currency",
		options: countries,
		placeholder: "Select a country",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Shipping destination",
		options: countries,
		placeholder: "Select a country",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Data residency region",
		options: countries,
		placeholder: "Select a country",
		size: "lg",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Filled: Story = {
	args: {
		label: "Billing country",
		options: countries,
		placeholder: "Select a country",
		variant: "filled",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const WithError: Story = {
	args: {
		label: "Billing country",
		options: countries,
		placeholder: "Select a country",
		errorMessage: "Please select a country to continue",
	},
};

export const Disabled: Story = {
	args: {
		label: "Plan region (set at signup)",
		options: countries,
		placeholder: "Select a country",
		disabled: true,
	},
};

export const DisabledWithValue: Story = {
	args: {
		label: "Account region (locked)",
		options: countries,
		defaultValue: "us",
		disabled: true,
	},
};

export const DisabledOptions: Story = {
	args: {
		label: "Deploy region",
		options: [
			{ value: "us", label: "US East (N. Virginia)" },
			{ value: "uk", label: "EU West (London) — at capacity", disabled: true },
			{ value: "ca", label: "Canada Central" },
			{ value: "au", label: "Australia — coming soon", disabled: true },
		],
		placeholder: "Select a region",
	},
};

// =============================================================================
// WIDTH
// =============================================================================

export const FullWidth: Story = {
	args: {
		label: "Billing country",
		options: countries,
		placeholder: "Select a country",
		fullWidth: true,
	},
	decorators: [
		(Story) => (
			<div style={{ width: "400px" }}>
				<Story />
			</div>
		),
	],
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Select
				label="Currency"
				options={countries}
				placeholder="Select"
				size="sm"
			/>
			<Select
				label="Shipping country"
				options={countries}
				placeholder="Select"
				size="md"
			/>
			<Select
				label="Data residency"
				options={countries}
				placeholder="Select"
				size="lg"
			/>
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Select
				label="Default"
				options={countries}
				placeholder="Select"
				variant="default"
			/>
			<Select
				label="Filled"
				options={countries}
				placeholder="Select"
				variant="filled"
			/>
		</div>
	),
};

export const Showcase: Story = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				width: "300px",
			}}
		>
			<Select
				label="Billing country"
				options={countries}
				placeholder="Select a country"
				helperText="Used to calculate applicable tax"
			/>
			<Select
				label="Preferred language"
				options={[
					{ value: "en", label: "English" },
					{ value: "es", label: "Spanish" },
					{ value: "fr", label: "French" },
					{ value: "de", label: "German" },
				]}
				defaultValue="en"
			/>
			<Select
				label="Time zone"
				options={[
					{ value: "pst", label: "Pacific Time (PST)" },
					{ value: "mst", label: "Mountain Time (MST)" },
					{ value: "cst", label: "Central Time (CST)" },
					{ value: "est", label: "Eastern Time (EST)" },
				]}
				placeholder="Select time zone"
				errorMessage="Time zone is required to schedule reminders"
			/>
			<Select
				label="Deploy region (locked to plan)"
				options={countries}
				defaultValue="us"
				disabled
			/>
		</div>
	),
};
