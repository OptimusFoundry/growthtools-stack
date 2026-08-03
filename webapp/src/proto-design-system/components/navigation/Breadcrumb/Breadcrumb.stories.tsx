import type { Meta, StoryObj } from "@storybook/react-vite";
import { File, Folder, Slash } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
	title: "Navigation/Breadcrumb",
	component: Breadcrumb,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
	args: {
		items: [
			{ label: "Home", href: "/" },
			{ label: "Products", href: "/products" },
			{ label: "Electronics", href: "/products/electronics" },
			{ label: "Laptops" },
		],
	},
};

export const Simple: Story = {
	args: {
		items: [
			{ label: "Home", href: "/" },
			{ label: "Settings", href: "/settings" },
			{ label: "Profile" },
		],
	},
};

export const WithIcons: Story = {
	args: {
		items: [
			{ label: "Documents", href: "/", icon: <Folder /> },
			{ label: "Projects", href: "/projects", icon: <Folder /> },
			{ label: "Design System", icon: <File /> },
		],
		showHomeIcon: false,
	},
};

export const CustomSeparator: Story = {
	args: {
		items: [
			{ label: "Home", href: "/" },
			{ label: "Design System", href: "/library" },
			{ label: "Breadcrumb" },
		],
		separator: <Slash />,
	},
};

export const TextSeparator: Story = {
	args: {
		items: [
			{ label: "Home", href: "/" },
			{ label: "Products", href: "/products" },
			{ label: "Home & Kitchen" },
		],
		separator: "/",
	},
};

export const Collapsed: Story = {
	args: {
		items: [
			{ label: "Home", href: "/" },
			{ label: "Products", href: "/products" },
			{ label: "Electronics", href: "/electronics" },
			{ label: "Computers", href: "/computers" },
			{ label: "Laptops", href: "/laptops" },
			{ label: "Gaming Laptops" },
		],
		maxItems: 3,
	},
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<Breadcrumb
				size="sm"
				items={[
					{ label: "Home", href: "/" },
					{ label: "Products", href: "/products" },
					{ label: "Small" },
				]}
			/>
			<Breadcrumb
				size="md"
				items={[
					{ label: "Home", href: "/" },
					{ label: "Products", href: "/products" },
					{ label: "Medium" },
				]}
			/>
			<Breadcrumb
				size="lg"
				items={[
					{ label: "Home", href: "/" },
					{ label: "Products", href: "/products" },
					{ label: "Large" },
				]}
			/>
		</div>
	),
};

export const NoHomeIcon: Story = {
	args: {
		items: [
			{ label: "Home", href: "/" },
			{ label: "About", href: "/about" },
			{ label: "Team" },
		],
		showHomeIcon: false,
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<Breadcrumb
				items={[
					{ label: "Home", href: "/" },
					{ label: "Documents", href: "/documents", icon: <Folder /> },
					{
						label: "Q3 Financials",
						href: "/documents/q3-financials",
						icon: <Folder />,
					},
					{ label: "board-deck-final.pdf", icon: <File /> },
				]}
			/>
			<Breadcrumb
				size="sm"
				items={[
					{ label: "Home", href: "/" },
					{ label: "Catalog", href: "/catalog" },
					{ label: "Outdoor Gear", href: "/catalog/outdoor" },
					{ label: "Tents", href: "/catalog/outdoor/tents" },
					{
						label: "4-Person Backpacking Tent",
						href: "/catalog/outdoor/tents/4p",
					},
					{ label: "Storm Grey" },
				]}
				maxItems={4}
			/>
		</div>
	),
};
