import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./Progress";

const meta: Meta<typeof Progress> = {
	title: "Feedback/Progress",
	component: Progress,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "success", "warning", "error"],
		},
		value: {
			control: { type: "range", min: 0, max: 100 },
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "300px" }}>
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
		value: 60,
		"aria-label": "Video export progress",
	},
};

export const WithLabel: Story = {
	args: {
		value: 42,
		showLabel: true,
		"aria-label": "Data import progress",
	},
};

export const Complete: Story = {
	args: {
		value: 100,
		showLabel: true,
		variant: "success",
		"aria-label": "Migration progress",
	},
};

export const Empty: Story = {
	args: {
		value: 0,
		showLabel: true,
		"aria-label": "Backup progress",
	},
};

// =============================================================================
// SIZES
// =============================================================================

export const Small: Story = {
	args: {
		value: 60,
		size: "sm",
		"aria-label": "Storage usage",
	},
};

export const Medium: Story = {
	args: {
		value: 60,
		size: "md",
		"aria-label": "Storage usage",
	},
};

export const Large: Story = {
	args: {
		value: 60,
		size: "lg",
		"aria-label": "Storage usage",
	},
};

// =============================================================================
// VARIANTS
// =============================================================================

export const Success: Story = {
	args: {
		value: 100,
		variant: "success",
		showLabel: true,
		"aria-label": "Deploy complete",
	},
};

export const Warning: Story = {
	args: {
		value: 82,
		variant: "warning",
		showLabel: true,
		"aria-label": "Storage quota used",
	},
};

export const ErrorVariant: Story = {
	args: {
		value: 34,
		variant: "error",
		showLabel: true,
		"aria-label": "Sync failed at",
	},
};

// =============================================================================
// INDETERMINATE
// =============================================================================

export const Indeterminate: Story = {
	args: {
		value: 0,
		indeterminate: true,
		"aria-label": "Generating report",
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						color: "var(--color-muted)",
						fontSize: "0.875rem",
					}}
				>
					Small — inline row indicator
				</p>
				<Progress value={60} size="sm" aria-label="Row upload progress" />
			</div>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						color: "var(--color-muted)",
						fontSize: "0.875rem",
					}}
				>
					Medium — default card usage
				</p>
				<Progress value={60} size="md" aria-label="Card upload progress" />
			</div>
			<div>
				<p
					style={{
						marginBottom: "0.5rem",
						color: "var(--color-muted)",
						fontSize: "0.875rem",
					}}
				>
					Large — full-width onboarding step
				</p>
				<Progress value={60} size="lg" aria-label="Onboarding progress" />
			</div>
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Progress
				value={28}
				variant="default"
				showLabel
				aria-label="Export progress"
			/>
			<Progress
				value={100}
				variant="success"
				showLabel
				aria-label="Backup complete"
			/>
			<Progress
				value={91}
				variant="warning"
				showLabel
				aria-label="Storage quota used"
			/>
			<Progress
				value={12}
				variant="error"
				showLabel
				aria-label="Sync stalled"
			/>
		</div>
	),
};

export const FileUpload: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.875rem" }}>Q3-financial-report.pdf</span>
					<span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
						2.4 MB
					</span>
				</div>
				<Progress
					value={100}
					variant="success"
					aria-label="Q3-financial-report.pdf upload complete"
				/>
			</div>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.875rem" }}>team-offsite-photos.zip</span>
					<span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
						118 MB
					</span>
				</div>
				<Progress
					value={65}
					showLabel
					aria-label="team-offsite-photos.zip upload progress"
				/>
			</div>
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginBottom: "0.5rem",
					}}
				>
					<span style={{ fontSize: "0.875rem" }}>onboarding-demo.mp4</span>
					<span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
						48.5 MB
					</span>
				</div>
				<Progress
					value={0}
					indeterminate
					aria-label="onboarding-demo.mp4 preparing upload"
				/>
			</div>
		</div>
	),
};

export const ImportCard: Story = {
	name: "Showcase — CSV Import Card",
	render: () => (
		<div
			style={{
				border: "1px solid var(--color-border)",
				borderRadius: "var(--radius-md)",
				padding: "var(--space-5)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-3)",
				background: "var(--color-surface)",
			}}
		>
			<div>
				<h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600 }}>
					Importing contacts.csv
				</h3>
				<p
					style={{
						margin: "4px 0 0",
						fontSize: "0.8125rem",
						color: "var(--color-muted)",
					}}
				>
					2,340 of 4,000 rows processed
				</p>
			</div>
			<Progress
				value={58}
				showLabel
				variant="default"
				aria-label="Contact import progress"
			/>
			<p
				style={{
					margin: 0,
					fontSize: "0.75rem",
					color: "var(--color-muted)",
				}}
			>
				Do not close this tab until the import finishes.
			</p>
		</div>
	),
};
