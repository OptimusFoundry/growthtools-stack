import type { Meta, StoryObj } from "@storybook/react-vite";
import { AspectRatio } from "./AspectRatio";

const meta: Meta<typeof AspectRatio> = {
	title: "Layout/AspectRatio",
	component: AspectRatio,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ maxWidth: "400px" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

const MediaPlaceholder = ({ label }: { label: string }) => (
	<div
		style={{
			width: "100%",
			height: "100%",
			background:
				"linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			color: "white",
			fontSize: "1rem",
			textAlign: "center",
			padding: "0 1rem",
		}}
	>
		{label}
	</div>
);

// =============================================================================
// PRESETS
// =============================================================================

export const Square: Story = {
	args: {
		ratio: "square",
		children: <MediaPlaceholder label="Avatar upload preview (1:1)" />,
	},
};

export const Video: Story = {
	args: {
		ratio: "video",
		children: <MediaPlaceholder label="Product demo thumbnail (16:9)" />,
	},
};

export const Portrait: Story = {
	args: {
		ratio: "portrait",
		children: <MediaPlaceholder label="Team member headshot (3:4)" />,
	},
};

export const Wide: Story = {
	args: {
		ratio: "wide",
		children: <MediaPlaceholder label="Blog post hero banner (21:9)" />,
	},
};

// =============================================================================
// CUSTOM RATIOS
// =============================================================================

export const Custom4by3: Story = {
	args: {
		ratio: 4 / 3,
		children: <MediaPlaceholder label="Legacy screenshot import (4:3)" />,
	},
};

export const Custom2by1: Story = {
	args: {
		ratio: 2 / 1,
		children: <MediaPlaceholder label="Social share card (2:1)" />,
	},
};

// =============================================================================
// WITH REAL CONTENT
// =============================================================================

export const WithImage: Story = {
	args: {
		ratio: "video",
		children: (
			<img
				src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
				alt="Company offsite in the mountains"
				style={{ objectFit: "cover" }}
			/>
		),
	},
};

export const WithVideo: Story = {
	args: {
		ratio: "video",
		children: (
			<iframe
				src="https://www.youtube.com/embed/dQw4w9WgXcQ"
				title="Product walkthrough"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				style={{ border: 0 }}
			/>
		),
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const AllPresets: Story = {
	render: () => (
		<div
			style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
		>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Square (1:1) — avatar
				</p>
				<AspectRatio ratio="square">
					<MediaPlaceholder label="Avatar" />
				</AspectRatio>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Video (16:9) — demo thumbnail
				</p>
				<AspectRatio ratio="video">
					<MediaPlaceholder label="Demo thumbnail" />
				</AspectRatio>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Portrait (3:4) — headshot
				</p>
				<AspectRatio ratio="portrait">
					<MediaPlaceholder label="Headshot" />
				</AspectRatio>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Wide (21:9) — hero banner
				</p>
				<AspectRatio ratio="wide">
					<MediaPlaceholder label="Hero banner" />
				</AspectRatio>
			</div>
		</div>
	),
};

export const ProductGalleryShowcase: Story = {
	name: "Showcase — Product screenshot gallery",
	render: () => {
		const screenshots = [
			"Dashboard overview",
			"Campaign builder",
			"Analytics report",
			"Team settings",
			"Billing summary",
			"API key manager",
		];
		return (
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, 1fr)",
					gap: "0.5rem",
					width: "400px",
				}}
			>
				{screenshots.map((label, i) => (
					<AspectRatio key={label} ratio="square">
						<div
							style={{
								background: `hsl(${i * 60}, 70%, 50%)`,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "white",
								fontSize: "0.75rem",
								textAlign: "center",
								padding: "0 0.5rem",
							}}
						>
							{label}
						</div>
					</AspectRatio>
				))}
			</div>
		);
	},
};
