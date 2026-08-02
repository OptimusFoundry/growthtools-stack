import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Stepper } from "./Stepper";

const meta: Meta<typeof Stepper> = {
	title: "Forms/Stepper",
	component: Stepper,
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
};

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(0);
			return (
				<Stepper value={value} onChange={setValue} aria-label="Quantity" />
			);
		};
		return <Demo />;
	},
};

export const WithMinMax: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(1);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					min={1}
					max={10}
					aria-label="Quantity (1–10)"
				/>
			);
		};
		return <Demo />;
	},
};

export const WithStep: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(0);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					step={5}
					min={0}
					max={100}
					aria-label="Progress (step 5)"
				/>
			);
		};
		return <Demo />;
	},
};

const noop = (_v: number) => {
	/* disabled — no-op for story */
};

export const Disabled: Story = {
	render: () => (
		<Stepper
			value={3}
			onChange={noop}
			disabled
			aria-label="Disabled quantity"
		/>
	),
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(0);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					size="sm"
					aria-label="Small stepper"
				/>
			);
		};
		return <Demo />;
	},
};

export const Medium: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(0);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					size="md"
					aria-label="Medium stepper"
				/>
			);
		};
		return <Demo />;
	},
};

export const Large: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(0);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					size="lg"
					aria-label="Large stepper"
				/>
			);
		};
		return <Demo />;
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => {
		const Demo = () => {
			const [sm, setSm] = useState(0);
			const [md, setMd] = useState(0);
			const [lg, setLg] = useState(0);
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-4)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "var(--space-4)",
						}}
					>
						<span
							style={{
								fontSize: "var(--font-size-sm)",
								color: "var(--color-muted)",
								width: "3rem",
							}}
						>
							sm
						</span>
						<Stepper value={sm} onChange={setSm} size="sm" aria-label="Small" />
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "var(--space-4)",
						}}
					>
						<span
							style={{
								fontSize: "var(--font-size-sm)",
								color: "var(--color-muted)",
								width: "3rem",
							}}
						>
							md
						</span>
						<Stepper
							value={md}
							onChange={setMd}
							size="md"
							aria-label="Medium"
						/>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "var(--space-4)",
						}}
					>
						<span
							style={{
								fontSize: "var(--font-size-sm)",
								color: "var(--color-muted)",
								width: "3rem",
							}}
						>
							lg
						</span>
						<Stepper value={lg} onChange={setLg} size="lg" aria-label="Large" />
					</div>
				</div>
			);
		};
		return <Demo />;
	},
};

export const CartExample: Story = {
	render: () => {
		const Demo = () => {
			const [qty, setQty] = useState(1);
			return (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "var(--space-6)",
						padding: "var(--space-4)",
						border: "1px solid var(--color-border)",
						borderRadius: "var(--radius-md)",
						width: "260px",
					}}
				>
					<span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
						Launch T-Shirt
					</span>
					<Stepper
						value={qty}
						onChange={setQty}
						min={1}
						max={99}
						aria-label="Item quantity"
					/>
				</div>
			);
		};
		return <Demo />;
	},
};
