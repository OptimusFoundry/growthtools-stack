import type { Meta, StoryObj } from "@storybook/react-vite";
import { Grid } from "../Grid/Grid";
import { PageShell } from "./PageShell";

const meta: Meta<typeof PageShell> = {
	title: "Layout/PageShell",
	component: PageShell,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"The standard full-page container. All product routes wrap their content in PageShell which applies consistent max-width, gutter, and top/bottom padding via design tokens. Direct children that are not Grid.Item are auto-wrapped in `<GridItem span={{ base: 12 }}>`. Do NOT nest PageShell inside PageShell.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "narrow", "full"],
			description:
				"Layout variant — default (1280px max), narrow (1024px), full (no max-width)",
		},
		animate: {
			control: "boolean",
			description: "Enable stagger animation for page sections",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Utility components for stories
const Section = ({
	label,
	height = 120,
}: {
	label: string;
	height?: number;
}) => (
	<div
		style={{
			height,
			background: "var(--color-surface)",
			border: "1px solid var(--color-border)",
			borderRadius: "var(--radius-md)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			color: "var(--color-muted)",
			fontSize: "var(--font-size-sm)",
		}}
	>
		{label}
	</div>
);

// =============================================================================
// SINGLE COLUMN (all sections full-width)
// =============================================================================

export const SingleColumn: Story = {
	render: () => (
		<PageShell>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Section A — span 12" />
			</Grid.Item>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Section B — span 12" />
			</Grid.Item>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Section C — span 12" />
			</Grid.Item>
		</PageShell>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Full-width single column layout — the most common pattern. Each section spans all 12 columns.",
			},
		},
	},
};

// =============================================================================
// TWO COLUMN HALF / HALF
// =============================================================================

export const TwoColumnHalf: Story = {
	render: () => (
		<PageShell>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Full-width header — span 12" height={80} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 6 }}>
				<Section label="Left column — span 12 → 6" height={200} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 6 }}>
				<Section label="Right column — span 12 → 6" height={200} />
			</Grid.Item>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Full-width footer — span 12" height={80} />
			</Grid.Item>
		</PageShell>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Two equal-half columns (6 + 6) on md and up, stacked single column on smaller viewports.",
			},
		},
	},
};

// =============================================================================
// THREE COLUMN THIRDS
// =============================================================================

export const ThreeColumnThird: Story = {
	render: () => (
		<PageShell>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Page header — span 12" height={80} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 4 }}>
				<Section label="Card 1 — span 12 → 4" height={160} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 4 }}>
				<Section label="Card 2 — span 12 → 4" height={160} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 4 }}>
				<Section label="Card 3 — span 12 → 4" height={160} />
			</Grid.Item>
		</PageShell>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Three equal-third columns (4 + 4 + 4) on md and up. Common for pricing cards, feature highlights.",
			},
		},
	},
};

// =============================================================================
// SIDEBAR + MAIN (3 + 9)
// =============================================================================

export const SidebarMain: Story = {
	render: () => (
		<PageShell>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Page header — span 12" height={80} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, lg: 3 }} as="nav">
				<Section label="Sidebar nav — span 12 → 3" height={400} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, lg: 9 }} as="main">
				<Section label="Main content — span 12 → 9" height={400} />
			</Grid.Item>
		</PageShell>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Sidebar + main layout (3 + 9) on lg and up, stacked single column on smaller viewports. Use as='nav' and as='main' for semantic HTML.",
			},
		},
	},
};

// =============================================================================
// NARROW VARIANT
// =============================================================================

export const NarrowVariant: Story = {
	render: () => (
		<PageShell variant="narrow">
			<Grid.Item span={{ base: 12 }}>
				<Section label="Narrow page header — span 12" height={80} />
			</Grid.Item>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Form content — max-width 1024px" height={300} />
			</Grid.Item>
		</PageShell>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Narrow variant (1024px max-width). Use for forms, settings pages, and auth-adjacent pages. Not for designed editorial splashes (like SigninPage — see Decision F).",
			},
		},
	},
};

// =============================================================================
// ANIMATED
// =============================================================================

export const Animated: Story = {
	render: () => (
		<PageShell animate>
			<Grid.Item span={{ base: 12 }}>
				<Section label="Section A — animates in" height={100} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 6 }}>
				<Section label="Section B — staggered" height={150} />
			</Grid.Item>
			<Grid.Item span={{ base: 12, md: 6 }}>
				<Section label="Section C — staggered" height={150} />
			</Grid.Item>
		</PageShell>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Sections animate in with stagger on mount. Refresh the page to see the animation.",
			},
		},
	},
};
