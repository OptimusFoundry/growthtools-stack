import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Slider } from "./Slider";

const meta: Meta<typeof Slider> = {
	title: "Forms/Slider",
	component: Slider,
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
		defaultValue: 50,
	},
};

export const WithLabel: Story = {
	args: {
		label: "Volume",
		defaultValue: 50,
	},
};

export const WithValue: Story = {
	args: {
		label: "Volume",
		defaultValue: 75,
		showValue: true,
	},
};

export const CustomRange: Story = {
	args: {
		label: "Temperature",
		min: -20,
		max: 40,
		defaultValue: 22,
		showValue: true,
		formatValue: (v: number) => `${v}°C`,
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		label: "Small",
		defaultValue: 50,
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Medium",
		defaultValue: 50,
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Large",
		defaultValue: 50,
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Disabled",
		defaultValue: 50,
		disabled: true,
	},
};

// =============================================================================
// CONTROLLED
// =============================================================================

const ControlledSlider = () => {
	const [value, setValue] = useState(50);
	return (
		<Slider
			label="Controlled"
			value={value}
			onChange={(e) => setValue(Number(e.target.value))}
			showValue
		/>
	);
};

export const Controlled: Story = {
	render: () => <ControlledSlider />,
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<Slider label="Small" size="sm" defaultValue={30} showValue />
			<Slider label="Medium" size="md" defaultValue={50} showValue />
			<Slider label="Large" size="lg" defaultValue={70} showValue />
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<Slider
				label="Volume"
				defaultValue={80}
				showValue
				formatValue={(v: number) => `${v}%`}
			/>
			<Slider
				label="Brightness"
				defaultValue={60}
				showValue
				formatValue={(v: number) => `${v}%`}
			/>
			<Slider
				label="Price range"
				min={0}
				max={1000}
				step={10}
				defaultValue={500}
				showValue
				formatValue={(v: number) => `$${v}`}
			/>
		</div>
	),
};
