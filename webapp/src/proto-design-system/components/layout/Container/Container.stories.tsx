import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "./Container";

const meta: Meta<typeof Container> = {
	title: "Layout/Container",
	component: Container,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg", "xl", "full"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const Panel = ({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: string;
	children: React.ReactNode;
}) => (
	<div
		style={{
			background: "var(--color-surface)",
			border: "1px solid var(--color-border)",
			borderRadius: "var(--radius-lg)",
			padding: "1.5rem",
		}}
	>
		<p
			style={{
				margin: "0 0 0.5rem",
				color: "var(--color-muted)",
				fontSize: "var(--font-size-xs)",
				textTransform: "uppercase",
				letterSpacing: "0.04em",
			}}
		>
			{eyebrow}
		</p>
		<h2 style={{ margin: "0 0 0.5rem", fontSize: "var(--font-size-lg)" }}>
			{title}
		</h2>
		<p style={{ margin: 0, color: "var(--color-muted)" }}>{children}</p>
	</div>
);

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		children: (
			<Panel eyebrow="Workspace" title="Acme Robotics">
				Default container width (1024px) — the standard reading and
				dashboard-content column.
			</Panel>
		),
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: (
			<Panel eyebrow="Auth" title="Sign in to your workspace">
				640px — sized for a login form or a single-column onboarding card.
			</Panel>
		),
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: (
			<Panel eyebrow="Docs" title="Setting up webhooks">
				768px — comfortable measure for long-form documentation and blog posts.
			</Panel>
		),
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: (
			<Panel eyebrow="Billing" title="Plan &amp; usage">
				1024px — the default width for most product pages and dashboards.
			</Panel>
		),
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
		children: (
			<Panel eyebrow="Analytics" title="Revenue overview">
				1280px — wide dashboards with multi-column stat grids or charts.
			</Panel>
		),
	},
};

export const Full: Story = {
	args: {
		size: "full",
		children: (
			<Panel eyebrow="Marketing" title="Full-width hero banner">
				No max-width — spans the viewport for hero sections and edge-to-edge
				media.
			</Panel>
		),
	},
};

// =============================================================================
// OPTIONS
// =============================================================================

export const NotCentered: Story = {
	args: {
		size: "md",
		centered: false,
		children: (
			<Panel eyebrow="Sidebar" title="Left-aligned panel">
				Useful inside a sidebar or split layout where the container should hug
				the left edge instead of centering.
			</Panel>
		),
	},
};

export const NoPadding: Story = {
	args: {
		size: "lg",
		padded: false,
		children: (
			<Panel eyebrow="Media" title="Edge-to-edge image gallery">
				Padding disabled — the container only constrains max-width, leaving
				horizontal spacing to the child content.
			</Panel>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Container size="sm">
				<Panel eyebrow="sm · 640px" title="Sign in">
					Login and onboarding forms.
				</Panel>
			</Container>
			<Container size="md">
				<Panel eyebrow="md · 768px" title="Documentation">
					Long-form prose and articles.
				</Panel>
			</Container>
			<Container size="lg">
				<Panel eyebrow="lg · 1024px" title="Product dashboard">
					The default width for most pages.
				</Panel>
			</Container>
			<Container size="xl">
				<Panel eyebrow="xl · 1280px" title="Analytics dashboard">
					Wide multi-column layouts.
				</Panel>
			</Container>
		</div>
	),
};

export const ArticlePage: Story = {
	render: () => (
		<Container size="md">
			<article>
				<p
					style={{
						margin: "0 0 0.5rem",
						color: "var(--color-muted)",
						fontSize: "var(--font-size-xs)",
						textTransform: "uppercase",
						letterSpacing: "0.04em",
					}}
				>
					Engineering
				</p>
				<h1 style={{ margin: "0 0 1rem", fontSize: "var(--font-size-2xl)" }}>
					How we scaled webhook delivery to 10M events a day
				</h1>
				<p
					style={{
						margin: "0 0 1rem",
						color: "var(--color-muted)",
						lineHeight: 1.7,
					}}
				>
					When we first shipped webhooks, a single worker polling Postgres was
					enough. As usage grew past a few thousand subscribers, delivery
					latency crept from milliseconds into minutes, and we knew the naive
					approach had run its course.
				</p>
				<p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.7 }}>
					This post walks through the redesign — moving delivery onto a
					Kafka-backed queue, adding exponential backoff with jitter, and the
					dashboard changes that let customers replay failed events on demand.
				</p>
			</article>
		</Container>
	),
};
