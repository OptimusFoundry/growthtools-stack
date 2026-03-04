import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../Checkbox";
import { Input } from "../Input";
import { Select } from "../Select";
import { TextArea } from "../TextArea";
import { FormField } from "./FormField";

const meta: Meta<typeof FormField> = {
	title: "Forms/FormField",
	component: FormField,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "300px" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		label: "Email",
		children: <Input type="email" placeholder="you@example.com" />,
	},
};

export const WithHelperText: Story = {
	args: {
		label: "Password",
		helperText: "Must be at least 8 characters",
		children: <Input type="password" placeholder="Enter password" />,
	},
};

export const WithErrorMessage: Story = {
	args: {
		label: "Email",
		errorMessage: "Please enter a valid email address",
		children: <Input type="email" placeholder="you@example.com" isError />,
	},
};

export const Required: Story = {
	args: {
		label: "Full name",
		required: true,
		children: <Input placeholder="John Doe" />,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small field",
		size: "sm",
		children: <Input size="sm" placeholder="Small input" />,
	},
};

export const Medium: Story = {
	args: {
		label: "Medium field",
		size: "md",
		children: <Input size="md" placeholder="Medium input" />,
	},
};

export const Large: Story = {
	args: {
		label: "Large field",
		size: "lg",
		children: <Input size="lg" placeholder="Large input" />,
	},
};

// =============================================================================
// WITH DIFFERENT INPUTS
// =============================================================================

export const WithTextArea: Story = {
	args: {
		label: "Description",
		helperText: "Enter a brief description",
		children: <TextArea placeholder="Enter description..." rows={4} />,
	},
};

export const WithSelect: Story = {
	args: {
		label: "Country",
		helperText: "Select your country of residence",
		children: (
			<Select
				options={[
					{ value: "us", label: "United States" },
					{ value: "uk", label: "United Kingdom" },
					{ value: "ca", label: "Canada" },
				]}
				placeholder="Select a country"
			/>
		),
	},
};

export const WithCheckbox: Story = {
	args: {
		children: <Checkbox label="I agree to the terms and conditions" />,
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const FormExample: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<FormField label="Full name" required>
				<Input placeholder="John Doe" />
			</FormField>
			<FormField
				label="Email"
				required
				helperText="We'll never share your email"
			>
				<Input type="email" placeholder="you@example.com" />
			</FormField>
			<FormField
				label="Password"
				required
				helperText="Must be at least 8 characters"
			>
				<Input type="password" placeholder="Enter password" />
			</FormField>
			<FormField label="Bio" helperText="Tell us about yourself">
				<TextArea placeholder="Write something..." rows={3} />
			</FormField>
			<FormField>
				<Checkbox label="Subscribe to newsletter" />
			</FormField>
		</div>
	),
};
