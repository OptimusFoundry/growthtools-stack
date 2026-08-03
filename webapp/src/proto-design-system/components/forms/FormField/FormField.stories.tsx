import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "@/proto-design-system/components/forms/Checkbox/Checkbox";
import { Input } from "@/proto-design-system/components/forms/Input/Input";
import { Select } from "@/proto-design-system/components/forms/Select/Select";
import { TextArea } from "@/proto-design-system/components/forms/TextArea/TextArea";
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
		label: "Work email",
		children: <Input type="email" placeholder="alex@northwind.dev" />,
	},
};

export const WithHelperText: Story = {
	args: {
		label: "New password",
		helperText: "At least 8 characters, with one number",
		children: <Input type="password" placeholder="Enter a new password" />,
	},
};

export const WithErrorMessage: Story = {
	args: {
		label: "Recovery email",
		errorMessage: "That address is already linked to another account",
		children: <Input type="email" placeholder="alex@northwind.dev" isError />,
	},
};

export const Required: Story = {
	args: {
		label: "Legal name",
		required: true,
		children: <Input placeholder="Alexandra Chen" />,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Coupon code",
		size: "sm",
		children: <Input size="sm" placeholder="SAVE20" />,
	},
};

export const Medium: Story = {
	args: {
		label: "Project name",
		size: "md",
		children: <Input size="md" placeholder="Q3 Launch Plan" />,
	},
};

export const Large: Story = {
	args: {
		label: "Organization name",
		size: "lg",
		children: <Input size="lg" placeholder="Northwind Traders Inc." />,
	},
};

// =============================================================================
// WITH DIFFERENT INPUTS
// =============================================================================

export const WithTextArea: Story = {
	args: {
		label: "What broke?",
		helperText: "Include steps to reproduce if you can",
		children: (
			<TextArea
				placeholder="The export button spins forever on Safari..."
				rows={4}
			/>
		),
	},
};

export const WithSelect: Story = {
	args: {
		label: "Billing country",
		helperText: "Used to calculate applicable tax",
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
		children: (
			<Checkbox label="I agree to the Terms of Service and Privacy Policy" />
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<FormField label="Legal name" required>
				<Input placeholder="Alexandra Chen" />
			</FormField>
			<FormField
				label="Work email"
				required
				helperText="We'll send your invoices here"
			>
				<Input type="email" placeholder="alex@northwind.dev" />
			</FormField>
			<FormField
				label="Password"
				required
				errorMessage="Password must include at least one number"
			>
				<Input type="password" placeholder="Enter a new password" isError />
			</FormField>
			<FormField
				label="Company bio"
				helperText="Shown on your public profile page"
			>
				<TextArea
					placeholder="Northwind Traders builds tools for..."
					rows={3}
				/>
			</FormField>
			<FormField>
				<Checkbox label="Send me product updates and tips" />
			</FormField>
		</div>
	),
};
