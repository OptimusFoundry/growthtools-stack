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
				<Stepper
					value={value}
					onChange={setValue}
					aria-label="Number of guests"
				/>
			);
		};
		return <Demo />;
	},
};

export const WithMinMax: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(2);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					min={1}
					max={8}
					aria-label="Party size (1–8)"
				/>
			);
		};
		return <Demo />;
	},
};

export const WithStep: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(20);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					step={5}
					min={0}
					max={100}
					aria-label="API rate limit (requests/min, step 5)"
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
			aria-label="Seats (locked while invite is pending)"
		/>
	),
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(1);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					size="sm"
					aria-label="Number of dependents"
				/>
			);
		};
		return <Demo />;
	},
};

export const Medium: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(1);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					size="md"
					aria-label="Ticket quantity"
				/>
			);
		};
		return <Demo />;
	},
};

export const Large: Story = {
	render: () => {
		const Demo = () => {
			const [value, setValue] = useState(2);
			return (
				<Stepper
					value={value}
					onChange={setValue}
					size="lg"
					aria-label="Nights booked"
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
			const [sm, setSm] = useState(1);
			const [md, setMd] = useState(2);
			const [lg, setLg] = useState(3);
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
								width: "5rem",
							}}
						>
							Children
						</span>
						<Stepper
							value={sm}
							onChange={setSm}
							size="sm"
							aria-label="Number of children"
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
								width: "5rem",
							}}
						>
							Adults
						</span>
						<Stepper
							value={md}
							onChange={setMd}
							size="md"
							aria-label="Number of adults"
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
								width: "5rem",
							}}
						>
							Rooms
						</span>
						<Stepper
							value={lg}
							onChange={setLg}
							size="lg"
							aria-label="Number of rooms"
						/>
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
						width: "280px",
					}}
				>
					<span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
						Pro plan seat
					</span>
					<Stepper
						value={qty}
						onChange={setQty}
						min={1}
						max={50}
						aria-label="Number of seats"
					/>
				</div>
			);
		};
		return <Demo />;
	},
};
