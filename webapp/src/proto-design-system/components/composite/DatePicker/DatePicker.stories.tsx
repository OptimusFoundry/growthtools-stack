import type { Meta, StoryObj } from "@storybook/react";
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

export const Default: Story = {
	render: (args) => {
		const [date, setDate] = useState<Date | null>(null);
		return <DatePicker {...args} value={date} onChange={setDate} />;
	},
	args: {
		placeholder: "Select date...",
	},
};

export const WithValue: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(new Date());
		return <DatePicker value={date} onChange={setDate} />;
	},
};

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
				<DatePicker value={sm} onChange={setSm} size="sm" placeholder="Small" />
				<DatePicker
					value={md}
					onChange={setMd}
					size="md"
					placeholder="Medium"
				/>
				<DatePicker value={lg} onChange={setLg} size="lg" placeholder="Large" />
			</div>
		);
	},
};

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
					Only dates in the current month are selectable.
				</p>
				<DatePicker
					value={date}
					onChange={setDate}
					minDate={minDate}
					maxDate={maxDate}
				/>
			</div>
		);
	},
};

export const CustomFormat: Story = {
	render: () => {
		const [date, setDate] = useState<Date | null>(new Date());

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
					Week starts on Monday.
				</p>
				<DatePicker value={date} onChange={setDate} firstDayOfWeek={1} />
			</div>
		);
	},
};

export const Disabled: Story = {
	render: () => {
		return <DatePicker placeholder="Disabled date picker" disabled />;
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
					Only future dates are selectable.
				</p>
				<DatePicker value={date} onChange={setDate} minDate={today} />
			</div>
		);
	},
};
