import { createContext } from "react";
import type { ThemeName } from "./themes";

// Bridges Storybook's global "theme" toolbar control (read/written via
// storybook/preview-api's useGlobals, which has its own hook-tracking
// separate from React's) into plain React state a story component can
// consume with a normal useContext call. Calling useGlobals directly inside
// a story component broke Storybook's hook bookkeeping across navigation
// between stories with different hook counts ("Rendered more hooks than
// during the previous render") — useGlobals must stay confined to the one
// place it's always called uniformly: the global decorator in preview.ts.
export interface ThemeGlobalValue {
	theme: ThemeName;
	setTheme: (theme: ThemeName) => void;
}

export const ThemeGlobalContext = createContext<ThemeGlobalValue>({
	theme: "light",
	setTheme: () => {
		/* overridden by the provider in preview.ts's themeDecorator */
	},
});
