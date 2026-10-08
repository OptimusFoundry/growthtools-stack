import "../src/styles/layers.css";
import "@optimusfoundry/quiet/style.css";
import "@optimusfoundry/quiet/fonts.css";
import "../src/styles/proto-legacy.scss";
import "../src/index.css";
import {
	SidebarProvider,
	type ThemeName,
	ThemeProvider,
	useTheme,
} from "@optimusfoundry/quiet";
import type { Decorator, Preview } from "@storybook/react-vite";
import { createElement, useEffect } from "react";
import { AppRoot } from "@/contexts/AppRoot";
import { showcaseDecorator } from "./showcaseDecorator";

const THEMES: { value: ThemeName; title: string }[] = [
	{ value: "foundry", title: "Light" },
	{ value: "foundry-dark", title: "Dark" },
];

// ThemeProvider prefers localStorage over defaultValue on mount, so the toolbar value must be pushed in.
function StoryTheme({ theme }: { theme: ThemeName }) {
	const { theme: current, setTheme } = useTheme();
	useEffect(() => {
		if (current !== theme) setTheme(theme);
	}, [current, theme, setTheme]);
	return null;
}

const quietDecorator: Decorator = (Story, context) => {
	const requested = context.globals.theme as string | undefined;
	const theme: ThemeName =
		THEMES.find((t) => t.value === requested)?.value ?? "foundry";
	return createElement(ThemeProvider, {
		defaultValue: theme,
		children: [
			createElement(StoryTheme, { key: "theme", theme }),
			createElement(AppRoot, {
				key: "root",
				children: createElement(SidebarProvider, {
					breakpoint: 720,
					children: createElement(Story),
				}),
			}),
		],
	});
};

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},

	globalTypes: {
		theme: {
			description: "Theme",
			toolbar: {
				title: "Theme",
				icon: "paintbrush",
				dynamicTitle: true,
				items: THEMES,
			},
		},
	},

	decorators: [showcaseDecorator, quietDecorator],

	initialGlobals: {
		theme: "foundry",
	},
};

export default preview;
