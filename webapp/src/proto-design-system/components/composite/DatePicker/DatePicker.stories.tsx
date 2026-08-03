import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./DatePicker";

const meta: Meta<typeof DatePicker> = {
	title: "Composite/DatePicker",
	component: DatePicker,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: (args) => {
		const [date, setDate] = useState<Date | null>(null);
		return <DatePicker {...args} value={date} onChange={setDate} />;
	},
	args: {
		placeholder: "Select a renewal date",
	},
};

export const WithValue: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(new Date(2026, 8, 15));
		return <DatePicker value={date} onChange={setDate} />;
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Sizes: Story = {
	render: () => {
		const [sm, setSm] = useState<Date | null>(null);
		const [md, setMd] = useState<Date | null>(null);
		const [lg, setLg] = useState<Date | null>(null);

		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
					alignItems: "flex-start",
				}}
			>
				<DatePicker
					value={sm}
					onChange={setSm}
					size="sm"
					placeholder="Start date"
				/>
				<DatePicker
					value={md}
					onChange={setMd}
					size="md"
					placeholder="Due date"
				/>
				<DatePicker
					value={lg}
					onChange={setLg}
					size="lg"
					placeholder="Contract end date"
				/>
			</div>
		);
	},
};

// =============================================================================
// CONSTRAINTS
// =============================================================================

export const WithMinMax: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(null);
		const today = new Date();
		const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
		const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

		return (
			<div>
				<p
					style={{
						marginBottom: "1rem",
						fontSize: "14px",
						color: "var(--color-muted)",
					}}
				>
					Choose an invoice date within the current billing month.
				</p>
				<DatePicker
					value={date}
					onChange={setDate}
					minDate={minDate}
					maxDate={maxDate}
					placeholder="Invoice date"
				/>
			</div>
		);
	},
};

export const FutureDatesOnly: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(null);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return (
			<div>
				<p
					style={{
						marginBottom: "1rem",
						fontSize: "14px",
						color: "var(--color-muted)",
					}}
				>
					Schedule a campaign to send on or after today.
				</p>
				<DatePicker
					value={date}
					onChange={setDate}
					minDate={today}
					placeholder="Send date"
				/>
			</div>
		);
	},
};

// =============================================================================
// FORMATTING
// =============================================================================

export const CustomFormat: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(new Date(2026, 5, 3));

		const formatDate = (d: Date) => {
			return d.toLocaleDateString("en-GB", {
				weekday: "short",
				day: "2-digit",
				month: "short",
				year: "numeric",
			});
		};

		return (
			<DatePicker value={date} onChange={setDate} formatDate={formatDate} />
		);
	},
};

export const MondayFirst: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(null);

		return (
			<div>
				<p
					style={{
						marginBottom: "1rem",
						fontSize: "14px",
						color: "var(--color-muted)",
					}}
				>
					Calendar week starts on Monday, matching your team's locale.
				</p>
				<DatePicker
					value={date}
					onChange={setDate}
					firstDayOfWeek={1}
					placeholder="Meeting date"
				/>
			</div>
		);
	},
};

// =============================================================================
// STATES
// =============================================================================

export const Disabled: Story = {
	render: () => {
		return <DatePicker placeholder="Locked to plan renewal date" disabled />;
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => {
		const [start, setStart] = useState<Date | null>(new Date(2026, 7, 1));
		const [end, setEnd] = useState<Date | null>(new Date(2026, 7, 31));
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
					width: "280px",
				}}
			>
				<p style={{ fontSize: "14px", color: "var(--color-muted)" }}>
					Export usage report for a custom date range.
				</p>
				<DatePicker
					value={start}
					onChange={setStart}
					maxDate={end ?? undefined}
					placeholder="Range start"
				/>
				<DatePicker
					value={end}
					onChange={setEnd}
					minDate={start ?? undefined}
					maxDate={today}
					placeholder="Range end"
				/>
			</div>
		);
	},
};
