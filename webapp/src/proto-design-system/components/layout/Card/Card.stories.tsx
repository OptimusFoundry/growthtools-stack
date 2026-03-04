import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardBody, CardFooter, CardHeader } from "./Card";

const meta: Meta<typeof Card> = {
	title: "Layout/Card",
	component: Card,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["elevated", "outlined", "filled"],
		},
		padding: {
			control: "select",
			options: ["none", "sm", "md", "lg"],
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "320px" }}>
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
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Card Title</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This is some card content that describes the card.
				</p>
			</>
		),
	},
};

export const Elevated: Story = {
	args: {
		variant: "elevated",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Elevated Card</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This card has a shadow effect.
				</p>
			</>
		),
	},
};

export const Outlined: Story = {
	args: {
		variant: "outlined",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Outlined Card</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This card has a border.
				</p>
			</>
		),
	},
};

export const Filled: Story = {
	args: {
		variant: "filled",
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Filled Card</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					This card has a filled background.
				</p>
			</>
		),
	},
};

// =============================================================================
// PADDING
// =============================================================================

export const SmallPadding: Story = {
	args: {
		padding: "sm",
		children: <p style={{ margin: 0 }}>Small padding</p>,
	},
};

export const LargePadding: Story = {
	args: {
		padding: "lg",
		children: <p style={{ margin: 0 }}>Large padding</p>,
	},
};

// =============================================================================
// INTERACTIVE
// =============================================================================

export const Interactive: Story = {
	args: {
		interactive: true,
		onClick: () => alert("Card clicked!"),
		children: (
			<>
				<h3 style={{ margin: "0 0 0.5rem" }}>Interactive Card</h3>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>Click me!</p>
			</>
		),
	},
};

// =============================================================================
// WITH SUB-COMPONENTS
// =============================================================================

export const WithHeaderAndFooter: Story = {
	args: {
		children: (
			<>
				<CardHeader>
					<h3 style={{ margin: 0 }}>Card Header</h3>
				</CardHeader>
				<CardBody>
					<p style={{ margin: 0, color: "var(--color-muted)" }}>
						This is the main content area of the card. It can contain any
						content you need.
					</p>
				</CardBody>
				<CardFooter>
					<button
						type="button"
						style={{
							background: "var(--color-primary)",
							color: "white",
							border: "none",
							padding: "0.5rem 1rem",
							borderRadius: "var(--radius-md)",
							cursor: "pointer",
						}}
					>
						Action
					</button>
				</CardFooter>
			</>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Card variant="elevated">
				<h4 style={{ margin: "0 0 0.5rem" }}>Elevated</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>With shadow</p>
			</Card>
			<Card variant="outlined">
				<h4 style={{ margin: "0 0 0.5rem" }}>Outlined</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>With border</p>
			</Card>
			<Card variant="filled">
				<h4 style={{ margin: "0 0 0.5rem" }}>Filled</h4>
				<p style={{ margin: 0, color: "var(--color-muted)" }}>
					With background
				</p>
			</Card>
		</div>
	),
};

export const ProfileCard: Story = {
	args: {
		variant: "elevated",
		padding: "lg",
		children: (
			<div style={{ textAlign: "center" }}>
				<div
					style={{
						width: "80px",
						height: "80px",
						borderRadius: "50%",
						background: "var(--color-primary)",
						margin: "0 auto 1rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
						fontSize: "2rem",
					}}
				>
					JD
				</div>
				<h3 style={{ margin: "0 0 0.25rem" }}>John Doe</h3>
				<p style={{ margin: "0 0 1rem", color: "var(--color-muted)" }}>
					Software Engineer
				</p>
				<button
					type="button"
					style={{
						background: "var(--color-primary)",
						color: "white",
						border: "none",
						padding: "0.5rem 1.5rem",
						borderRadius: "var(--radius-md)",
						cursor: "pointer",
						width: "100%",
					}}
				>
					Follow
				</button>
			</div>
		),
	},
};
