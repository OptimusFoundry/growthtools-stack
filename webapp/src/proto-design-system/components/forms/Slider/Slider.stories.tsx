import type { Meta, StoryObj } from "@storybook/react-vite";
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
		label: "Playback volume",
		defaultValue: 50,
	},
};

export const WithValue: Story = {
	args: {
		label: "Monthly budget alert",
		defaultValue: 75,
		showValue: true,
		formatValue: (v: number) => `$${v * 10}`,
	},
};

export const CustomRange: Story = {
	args: {
		label: "Thermostat target",
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
		label: "Zoom level",
		defaultValue: 50,
		size: "sm",
	},
};

export const Medium: Story = {
	args: {
		label: "Screen brightness",
		defaultValue: 50,
		size: "md",
	},
};

export const Large: Story = {
	args: {
		label: "Video export quality",
		defaultValue: 50,
		size: "lg",
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	args: {
		label: "Storage quota (managed by admin)",
		defaultValue: 80,
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
			label="AI response creativity"
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
			<Slider
				label="Small — search radius"
				size="sm"
				defaultValue={30}
				showValue
			/>
			<Slider
				label="Medium — cache size"
				size="md"
				defaultValue={50}
				showValue
			/>
			<Slider
				label="Large — checkout timeout"
				size="lg"
				defaultValue={70}
				showValue
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
				gap: "1.5rem",
				width: "320px",
			}}
		>
			<Slider
				label="Alert volume"
				defaultValue={80}
				showValue
				formatValue={(v: number) => `${v}%`}
			/>
			<Slider
				label="Auto-lock after inactivity"
				min={1}
				max={60}
				step={1}
				defaultValue={15}
				showValue
				formatValue={(v: number) => `${v} min`}
			/>
			<Slider
				label="Monthly spend limit"
				min={0}
				max={5000}
				step={50}
				defaultValue={1200}
				showValue
				formatValue={(v: number) => `$${v.toLocaleString()}`}
			/>
			<Slider
				label="Team seats (contact sales to increase)"
				min={1}
				max={25}
				defaultValue={10}
				showValue
				disabled
			/>
		</div>
	),
};
