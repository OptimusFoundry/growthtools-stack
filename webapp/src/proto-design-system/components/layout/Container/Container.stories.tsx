import type { Meta, StoryObj } from "@storybook/react";
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

const ContentBox = ({ label }: { label: string }) => (
	<div
		style={{
			background: "var(--color-primary)",
			color: "white",
			padding: "2rem",
			borderRadius: "var(--radius-md)",
			textAlign: "center",
		}}
	>
		{label}
	</div>
);

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	args: {
		children: <ContentBox label="Default Container (lg)" />,
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: <ContentBox label="Small Container (640px)" />,
	},
};

export const Medium: Story = {
	args: {
		size: "md",
		children: <ContentBox label="Medium Container (768px)" />,
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: <ContentBox label="Large Container (1024px)" />,
	},
};

export const ExtraLarge: Story = {
	args: {
		size: "xl",
		children: <ContentBox label="Extra Large Container (1280px)" />,
	},
};

export const Full: Story = {
	args: {
		size: "full",
		children: <ContentBox label="Full Width Container" />,
	},
};

// =============================================================================
// OPTIONS
// =============================================================================

export const NotCentered: Story = {
	args: {
		size: "md",
		centered: false,
		children: <ContentBox label="Not Centered" />,
	},
};

export const NoPadding: Story = {
	args: {
		size: "lg",
		padded: false,
		children: <ContentBox label="No Padding" />,
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<Container size="sm">
				<ContentBox label="sm (640px)" />
			</Container>
			<Container size="md">
				<ContentBox label="md (768px)" />
			</Container>
			<Container size="lg">
				<ContentBox label="lg (1024px)" />
			</Container>
			<Container size="xl">
				<ContentBox label="xl (1280px)" />
			</Container>
		</div>
	),
};
