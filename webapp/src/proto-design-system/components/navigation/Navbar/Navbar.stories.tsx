import type { Meta, StoryObj } from "@storybook/react";
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
		Proto
	</span>
);

const Actions = () => (
	<>
		<button
			type="button"
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
				Home
			</NavLink>
			<NavLink href="#">Products</NavLink>
			<NavLink href="#">About</NavLink>
			<NavLink href="#">Contact</NavLink>
		</Navbar>
	),
};

export const Transparent: Story = {
	render: () => (
		<div style={{ background: "var(--color-base-100)", minHeight: "200px" }}>
			<Navbar variant="transparent" brand={<Logo />} actions={<Actions />}>
				<NavLink href="#" active>
					Home
				</NavLink>
				<NavLink href="#">Products</NavLink>
				<NavLink href="#">About</NavLink>
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
					Proto
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
					Sign In
				</button>
			}
		>
			<NavLink href="#" active>
				Home
			</NavLink>
			<NavLink href="#">Products</NavLink>
			<NavLink href="#">About</NavLink>
		</Navbar>
	),
};

export const Sticky: Story = {
	render: () => (
		<div style={{ height: "400px", overflow: "auto" }}>
			<Navbar sticky brand={<Logo />} actions={<Actions />}>
				<NavLink href="#" active>
					Home
				</NavLink>
				<NavLink href="#">Products</NavLink>
				<NavLink href="#">About</NavLink>
			</Navbar>
			<div style={{ padding: "2rem" }}>
				<p style={{ marginBottom: "1rem" }}>
					Scroll down to see the sticky navbar in action.
				</p>
				<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					{[...Array(20)].map((_, idx) => {
						const id = `lorem-${idx}`;
						return (
							<p key={id}>
								Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
								eiusmod tempor incididunt ut labore et dolore magna aliqua.
							</p>
						);
					})}
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
			<NavLink href="#">Projects</NavLink>
			<NavLink href="#">Team</NavLink>
			<NavLink href="#">Settings</NavLink>
		</Navbar>
	),
};
