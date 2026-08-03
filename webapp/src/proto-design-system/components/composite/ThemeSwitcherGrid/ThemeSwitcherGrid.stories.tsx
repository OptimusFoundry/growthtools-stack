import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { ThemeName } from "../../../themes/themes";
import { ThemeSwitcherGrid } from "./ThemeSwitcherGrid";

const meta: Meta<typeof ThemeSwitcherGrid> = {
	title: "Composite/ThemeSwitcherGrid",
	component: ThemeSwitcherGrid,
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof ThemeSwitcherGrid>;

// =============================================================================
// BASIC
// =============================================================================

export const Default: Story = {
	render: () => {
		const [value, setValue] = useState<ThemeName>("paper");
		return (
			<div style={{ width: "24rem" }}>
				<ThemeSwitcherGrid value={value} onChange={setValue} />
			</div>
		);
	},
};

export const DarkSelected: Story = {
	render: () => {
		const [value, setValue] = useState<ThemeName>("dark");
		return (
			<div style={{ width: "24rem" }}>
				<ThemeSwitcherGrid value={value} onChange={setValue} />
			</div>
		);
	},
};

// =============================================================================
// SHOWCASE
// =============================================================================

export const Showcase: Story = {
	render: () => {
		const [value, setValue] = useState<ThemeName>("paper");
		return (
			<div
				style={{
					width: "26rem",
					padding: "1.5rem",
					border: "1px solid var(--color-border)",
					borderRadius: "12px",
					background: "var(--color-surface)",
				}}
			>
				<div style={{ marginBottom: "1rem" }}>
					<div style={{ fontSize: "15px", fontWeight: 600 }}>Appearance</div>
					<div style={{ fontSize: "13px", color: "var(--color-muted)" }}>
						Choose how your workspace looks. This only affects your account, not
						your teammates'.
					</div>
				</div>
				<ThemeSwitcherGrid value={value} onChange={setValue} />
			</div>
		);
	},
};
