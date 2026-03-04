import type { Meta, StoryObj } from "@storybook/react";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { StatCard } from "./StatCard";

const meta: Meta<typeof StatCard> = {
	title: "Data/StatCard",
	component: StatCard,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "outlined", "filled"],
		},
		trend: {
			control: "select",
			options: ["up", "down", "neutral"],
		},
		numericValue: {
			control: "number",
			description:
				"Numeric value for count-up animation (overrides value when provided)",
		},
	},
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
	args: {
		label: "Total Revenue",
		value: "$45,231.89",
		trend: "up",
		trendValue: "+12.5%",
		description: "vs last month",
	},
};

export const WithIcon: Story = {
	args: {
		label: "Total Users",
		value: "2,350",
		trend: "up",
		trendValue: "+180",
		description: "new this week",
		icon: <Users />,
	},
};

export const TrendDown: Story = {
	args: {
		label: "Bounce Rate",
		value: "42.5%",
		trend: "down",
		trendValue: "-4.3%",
		description: "vs last week",
	},
};

export const Neutral: Story = {
	args: {
		label: "Active Sessions",
		value: "1,234",
		trend: "neutral",
		trendValue: "0%",
		description: "no change",
	},
};

export const WithPreviousValue: Story = {
	args: {
		label: "Monthly Sales",
		value: "$12,450",
		previousValue: "$11,200",
		trend: "up",
		trendValue: "+11.2%",
	},
};

export const Outlined: Story = {
	args: {
		label: "Orders",
		value: "456",
		trend: "up",
		trendValue: "+23",
		description: "this week",
		variant: "outlined",
		icon: <ShoppingCart />,
	},
};

export const Filled: Story = {
	args: {
		label: "Conversion Rate",
		value: "3.24%",
		trend: "up",
		trendValue: "+0.5%",
		description: "vs last quarter",
		variant: "filled",
		icon: <TrendingUp />,
	},
};

export const Clickable: Story = {
	args: {
		label: "Revenue",
		value: "$89,432",
		trend: "up",
		trendValue: "+8.2%",
		description: "Click for details",
		icon: <DollarSign />,
		onClick: () => alert("Clicked!"),
	},
};

export const SimpleValue: Story = {
	args: {
		label: "Total Items",
		value: "1,234",
	},
};

export const AnimatedValue: Story = {
	args: {
		label: "Total Users",
		numericValue: 12450,
		trend: "up",
		trendValue: "+15%",
		description: "Count-up animation on mount",
		icon: <Users />,
	},
};

export const AnimatedWithFormat: Story = {
	args: {
		label: "Total Revenue",
		numericValue: 45231,
		formatValue: (value: number) => `$${value.toLocaleString()}`,
		trend: "up",
		trendValue: "+20.1%",
		description: "Formatted as currency",
		icon: <DollarSign />,
	},
};

export const Grid: Story = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
				gap: "1rem",
			}}
		>
			<StatCard
				label="Total Revenue"
				value="$45,231.89"
				trend="up"
				trendValue="+20.1%"
				description="from last month"
				icon={<DollarSign />}
			/>
			<StatCard
				label="Subscriptions"
				value="+2350"
				trend="up"
				trendValue="+180.1%"
				description="from last month"
				icon={<Users />}
			/>
			<StatCard
				label="Sales"
				value="+12,234"
				trend="down"
				trendValue="-19%"
				description="from last month"
				icon={<ShoppingCart />}
			/>
			<StatCard
				label="Active Now"
				value="+573"
				trend="up"
				trendValue="+201"
				description="since last hour"
				icon={<TrendingUp />}
			/>
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<StatCard
				variant="default"
				label="Default Variant"
				value="$12,345"
				trend="up"
				trendValue="+5%"
			/>
			<StatCard
				variant="outlined"
				label="Outlined Variant"
				value="$12,345"
				trend="up"
				trendValue="+5%"
			/>
			<StatCard
				variant="filled"
				label="Filled Variant"
				value="$12,345"
				trend="up"
				trendValue="+5%"
			/>
		</div>
	),
};
