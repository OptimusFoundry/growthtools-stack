import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Search, User } from "lucide-react";
import { Navbar, NavLink } from "./Navbar";

const meta: Meta<typeof Navbar> = {
	title: "Navigation/Navbar",
	component: Navbar,
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "transparent", "filled"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Navbar>;

const Logo = () => (
	<span
		style={{
			fontSize: "1.25rem",
			fontWeight: 700,
			color: "var(--color-base-content)",
		}}
	>
		Northwind
	</span>
);

const Actions = () => (
	<>
		<button
			type="button"
			aria-label="Search"
			style={{
				background: "none",
				border: "none",
				cursor: "pointer",
				padding: "0.5rem",
				color: "var(--color-muted)",
			}}
		>
			<Search size={20} />
		</button>
		<button
			type="button"
			aria-label="Notifications"
			style={{
				background: "none",
				border: "none",
				cursor: "pointer",
				padding: "0.5rem",
				color: "var(--color-muted)",
			}}
		>
			<Bell size={20} />
		</button>
		<button
			type="button"
			style={{
				background: "var(--color-primary)",
				border: "none",
				borderRadius: "var(--radius-md)",
				color: "var(--color-primary-content)",
				cursor: "pointer",
				fontSize: "var(--font-size-sm)",
				fontWeight: 500,
				padding: "0.5rem 1rem",
			}}
		>
			Sign In
		</button>
	</>
);

export const Default: Story = {
	render: () => (
		<Navbar brand={<Logo />} actions={<Actions />}>
			<NavLink href="#" active>
				Product
			</NavLink>
			<NavLink href="#">Pricing</NavLink>
			<NavLink href="#">Docs</NavLink>
			<NavLink href="#">Changelog</NavLink>
		</Navbar>
	),
};

export const Transparent: Story = {
	render: () => (
		<div style={{ background: "var(--color-base-100)", minHeight: "200px" }}>
			<Navbar variant="transparent" brand={<Logo />} actions={<Actions />}>
				<NavLink href="#" active>
					Product
				</NavLink>
				<NavLink href="#">Pricing</NavLink>
				<NavLink href="#">Docs</NavLink>
			</Navbar>
		</div>
	),
};

export const Filled: Story = {
	render: () => (
		<Navbar
			variant="filled"
			brand={
				<span
					style={{
						fontSize: "1.25rem",
						fontWeight: 700,
						color: "var(--color-primary-content)",
					}}
				>
					Northwind
				</span>
			}
			actions={
				<button
					type="button"
					style={{
						background: "rgba(255,255,255,0.2)",
						border: "none",
						borderRadius: "var(--radius-md)",
						color: "var(--color-primary-content)",
						cursor: "pointer",
						fontSize: "var(--font-size-sm)",
						fontWeight: 500,
						padding: "0.5rem 1rem",
					}}
				>
					Start free trial
				</button>
			}
		>
			<NavLink href="#" active>
				Product
			</NavLink>
			<NavLink href="#">Pricing</NavLink>
			<NavLink href="#">Docs</NavLink>
		</Navbar>
	),
};

export const Sticky: Story = {
	render: () => (
		<div style={{ height: "400px", overflow: "auto" }}>
			<Navbar sticky brand={<Logo />} actions={<Actions />}>
				<NavLink href="#" active>
					Product
				</NavLink>
				<NavLink href="#">Pricing</NavLink>
				<NavLink href="#">Docs</NavLink>
			</Navbar>
			<div style={{ padding: "2rem" }}>
				<p style={{ marginBottom: "1rem" }}>
					Scroll down to see the navbar stay pinned to the top of the viewport.
				</p>
				<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					{[
						"Northwind syncs your inventory across every sales channel in real time, so a sale on one storefront instantly updates stock everywhere else.",
						"Set reorder thresholds per SKU and get a Slack alert the moment a bestseller is about to run out.",
						"Bulk edit pricing, tags, and descriptions across thousands of products without touching a spreadsheet.",
						"Every change is logged with a full audit trail, so you can see exactly who updated what and when.",
						"Connect Shopify, Amazon, and your warehouse management system with pre-built, no-code integrations.",
						"Generate purchase orders automatically based on historical demand and current lead times.",
						"Role-based permissions mean your warehouse team only sees what they need to fulfill orders.",
						"Export any report to CSV or push it straight into your existing BI dashboard.",
					].map((paragraph) => (
						<p key={paragraph.slice(0, 24)}>{paragraph}</p>
					))}
				</div>
			</div>
		</div>
	),
};

export const Simple: Story = {
	render: () => (
		<Navbar brand={<Logo />}>
			<NavLink href="#" active>
				Home
			</NavLink>
			<NavLink href="#">About</NavLink>
			<NavLink href="#">Contact</NavLink>
		</Navbar>
	),
};

export const WithAvatar: Story = {
	render: () => (
		<Navbar
			brand={<Logo />}
			actions={
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
					<button
						type="button"
						aria-label="Notifications"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "0.5rem",
							color: "var(--color-muted)",
						}}
					>
						<Bell size={20} />
					</button>
					<div
						style={{
							width: "2rem",
							height: "2rem",
							borderRadius: "var(--radius-full)",
							background: "var(--color-primary)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--color-primary-content)",
						}}
					>
						<User size={16} />
					</div>
				</div>
			}
		>
			<NavLink href="#" active>
				Dashboard
			</NavLink>
			<NavLink href="#">Inventory</NavLink>
			<NavLink href="#">Orders</NavLink>
			<NavLink href="#">Reports</NavLink>
		</Navbar>
	),
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<Navbar sticky brand={<Logo />} actions={<Actions />}>
				<NavLink href="#" active>
					Dashboard
				</NavLink>
				<NavLink href="#">Inventory</NavLink>
				<NavLink href="#">Orders</NavLink>
				<NavLink href="#">Reports</NavLink>
				<NavLink href="#">Settings</NavLink>
			</Navbar>
			<div style={{ padding: "2rem", background: "var(--color-base-100)" }}>
				<p>Product content renders below the fixed navigation bar.</p>
			</div>
		</div>
	),
};
