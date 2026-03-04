import type { Meta, StoryObj } from "@storybook/react";
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

const PlaceholderImage = () => (
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
			fontSize: "1.5rem",
		}}
	>
		Image
	</div>
);

// =============================================================================
// PRESETS
// =============================================================================

export const Square: Story = {
	args: {
		ratio: "square",
		children: <PlaceholderImage />,
	},
};

export const Video: Story = {
	args: {
		ratio: "video",
		children: <PlaceholderImage />,
	},
};

export const Portrait: Story = {
	args: {
		ratio: "portrait",
		children: <PlaceholderImage />,
	},
};

export const Wide: Story = {
	args: {
		ratio: "wide",
		children: <PlaceholderImage />,
	},
};

// =============================================================================
// CUSTOM RATIOS
// =============================================================================

export const Custom4by3: Story = {
	args: {
		ratio: 4 / 3,
		children: <PlaceholderImage />,
	},
};

export const Custom2by1: Story = {
	args: {
		ratio: 2 / 1,
		children: <PlaceholderImage />,
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
				alt="Mountain landscape"
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
				title="Video"
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
					Square (1:1)
				</p>
				<AspectRatio ratio="square">
					<PlaceholderImage />
				</AspectRatio>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Video (16:9)
				</p>
				<AspectRatio ratio="video">
					<PlaceholderImage />
				</AspectRatio>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Portrait (3:4)
				</p>
				<AspectRatio ratio="portrait">
					<PlaceholderImage />
				</AspectRatio>
			</div>
			<div>
				<p style={{ marginBottom: "0.5rem", color: "var(--color-muted)" }}>
					Wide (21:9)
				</p>
				<AspectRatio ratio="wide">
					<PlaceholderImage />
				</AspectRatio>
			</div>
		</div>
	),
};

export const ImageGallery: Story = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 1fr)",
				gap: "0.5rem",
			}}
		>
			{[1, 2, 3, 4, 5, 6].map((i) => (
				<AspectRatio key={i} ratio="square">
					<div
						style={{
							background: `hsl(${i * 60}, 70%, 50%)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "white",
							fontSize: "1.25rem",
						}}
					>
						{i}
					</div>
				</AspectRatio>
			))}
		</div>
	),
};
