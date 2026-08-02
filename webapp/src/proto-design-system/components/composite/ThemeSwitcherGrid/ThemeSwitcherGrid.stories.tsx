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

export const Default: Story = {
	render: () => {
		const [value, setValue] = useState<ThemeName>("light");
		return (
			<div style={{ width: "24rem" }}>
				<ThemeSwitcherGrid value={value} onChange={setValue} />
			</div>
		);
	},
};
