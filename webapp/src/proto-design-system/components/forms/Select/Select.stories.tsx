import type { Meta, StoryObj } from "@storybook/react";
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
		label: "Country",
		options: countries,
		placeholder: "Select a country",
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Country",
		options: countries,
		placeholder: "Select a country",
		helperText: "Choose your country of residence",
	},
};

export const WithValue: Story = {
	args: {
		label: "Country",
		options: countries,
		defaultValue: "uk",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Country",
		options: countries,
		placeholder: "Select a country",
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Country",
		options: countries,
		placeholder: "Select a country",
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Country",
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
		label: "Country",
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
		label: "Country",
		options: countries,
		placeholder: "Select a country",
		errorMessage: "Please select a country",
	},
};

export const Disabled: Story = {
	args: {
		label: "Country",
		options: countries,
		placeholder: "Select a country",
		disabled: true,
	},
};

export const DisabledWithValue: Story = {
	args: {
		label: "Country",
		options: countries,
		defaultValue: "us",
		disabled: true,
	},
};

export const DisabledOptions: Story = {
	args: {
		label: "Country",
		options: [
			{ value: "us", label: "United States" },
			{ value: "uk", label: "United Kingdom", disabled: true },
			{ value: "ca", label: "Canada" },
			{ value: "au", label: "Australia", disabled: true },
		],
		placeholder: "Select a country",
	},
};

// =============================================================================
// WIDTH
// =============================================================================

export const FullWidth: Story = {
	args: {
		label: "Country",
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
				label="Small"
				options={countries}
				placeholder="Select"
				size="sm"
			/>
			<Select
				label="Medium"
				options={countries}
				placeholder="Select"
				size="md"
			/>
			<Select
				label="Large"
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

export const FormExample: Story = {
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
				label="Country"
				options={countries}
				placeholder="Select a country"
				helperText="Your country of residence"
			/>
			<Select
				label="Preferred Language"
				options={[
					{ value: "en", label: "English" },
					{ value: "es", label: "Spanish" },
					{ value: "fr", label: "French" },
					{ value: "de", label: "German" },
				]}
				defaultValue="en"
			/>
			<Select
				label="Time Zone"
				options={[
					{ value: "pst", label: "Pacific Time (PST)" },
					{ value: "mst", label: "Mountain Time (MST)" },
					{ value: "cst", label: "Central Time (CST)" },
					{ value: "est", label: "Eastern Time (EST)" },
				]}
				placeholder="Select timezone"
				errorMessage="Timezone is required"
			/>
		</div>
	),
};
