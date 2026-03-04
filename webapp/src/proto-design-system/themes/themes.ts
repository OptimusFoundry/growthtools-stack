// =============================================================================
// THEME LOADER
// =============================================================================
// Dynamic theme loading with code-splitting support.

export type ThemeName =
	| "light"
	| "dark"
	| "midnight"
	| "forest"
	| "forest-light"
	| "ocean"
	| "rose"
	| "sunset"
	| "soft"
	| "neobrutalism"
	| "brutal"
	| "cyberpunk"
	| "synthwave"
	| "terminal"
	| "candy"
	| "monochrome"
	| "bioluminescent"
	| "sand"
	| "cosmos"
	| "claude"
	| "pop"
	| "acid"
	| "retro"
	| "lavender"
	| "citrus"
	| "holo"
	| "ink"
	| "pixel"
	| "riso"
	| "y2k"
	| "neon"
	| "neon-orange"
	| "lime"
	| "blueprint"
	| "paper";

export interface Theme {
	name: ThemeName;
	label: string;
	colorScheme: "light" | "dark";
}

export const themes: Record<ThemeName, Theme> = {
	light: {
		name: "light",
		label: "Light",
		colorScheme: "light",
	},
	dark: {
		name: "dark",
		label: "Dark",
		colorScheme: "dark",
	},
	midnight: {
		name: "midnight",
		label: "Midnight",
		colorScheme: "dark",
	},
	forest: {
		name: "forest",
		label: "Forest",
		colorScheme: "dark",
	},
	"forest-light": {
		name: "forest-light",
		label: "Forest Light",
		colorScheme: "light",
	},
	ocean: {
		name: "ocean",
		label: "Ocean",
		colorScheme: "light",
	},
	rose: {
		name: "rose",
		label: "Rose",
		colorScheme: "light",
	},
	sunset: {
		name: "sunset",
		label: "Sunset",
		colorScheme: "dark",
	},
	soft: {
		name: "soft",
		label: "Soft",
		colorScheme: "light",
	},
	neobrutalism: {
		name: "neobrutalism",
		label: "Neobrutalism",
		colorScheme: "light",
	},
	brutal: {
		name: "brutal",
		label: "Brutal",
		colorScheme: "light",
	},
	cyberpunk: {
		name: "cyberpunk",
		label: "Cyberpunk",
		colorScheme: "dark",
	},
	synthwave: {
		name: "synthwave",
		label: "Synthwave",
		colorScheme: "dark",
	},
	terminal: {
		name: "terminal",
		label: "Terminal",
		colorScheme: "dark",
	},
	candy: {
		name: "candy",
		label: "Candy",
		colorScheme: "light",
	},
	monochrome: {
		name: "monochrome",
		label: "Monochrome",
		colorScheme: "light",
	},
	bioluminescent: {
		name: "bioluminescent",
		label: "Bioluminescent",
		colorScheme: "dark",
	},
	sand: {
		name: "sand",
		label: "Sand",
		colorScheme: "light",
	},
	cosmos: {
		name: "cosmos",
		label: "Cosmos",
		colorScheme: "dark",
	},
	claude: {
		name: "claude",
		label: "Claude",
		colorScheme: "light",
	},
	pop: {
		name: "pop",
		label: "Pop",
		colorScheme: "light",
	},
	acid: {
		name: "acid",
		label: "Acid",
		colorScheme: "light",
	},
	retro: {
		name: "retro",
		label: "Retro",
		colorScheme: "light",
	},
	lavender: {
		name: "lavender",
		label: "Lavender",
		colorScheme: "light",
	},
	citrus: {
		name: "citrus",
		label: "Citrus",
		colorScheme: "light",
	},
	holo: {
		name: "holo",
		label: "Holo",
		colorScheme: "light",
	},
	ink: {
		name: "ink",
		label: "Ink",
		colorScheme: "light",
	},
	pixel: {
		name: "pixel",
		label: "Pixel",
		colorScheme: "light",
	},
	riso: {
		name: "riso",
		label: "Riso",
		colorScheme: "light",
	},
	y2k: {
		name: "y2k",
		label: "Y2K",
		colorScheme: "light",
	},
	neon: {
		name: "neon",
		label: "Neon",
		colorScheme: "light",
	},
	"neon-orange": {
		name: "neon-orange",
		label: "Neon Orange",
		colorScheme: "light",
	},
	lime: {
		name: "lime",
		label: "Lime",
		colorScheme: "light",
	},
	blueprint: {
		name: "blueprint",
		label: "Blueprint",
		colorScheme: "light",
	},
	paper: {
		name: "paper",
		label: "Paper",
		colorScheme: "light",
	},
};

export const themeNames = Object.keys(themes) as ThemeName[];

/**
 * Applies a theme to the document
 */
export function applyTheme(theme: ThemeName): void {
	document.documentElement.setAttribute("data-theme", theme);

	// Update color-scheme meta for system UI
	const colorScheme = themes[theme].colorScheme;
	document.documentElement.style.colorScheme = colorScheme;
}

/**
 * Gets the currently active theme
 */
export function getCurrentTheme(): ThemeName {
	const theme = document.documentElement.getAttribute(
		"data-theme",
	) as ThemeName | null;
	return theme && theme in themes ? theme : "light";
}

/**
 * Gets the system preferred color scheme
 */
export function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Subscribes to system theme changes
 */
export function subscribeToSystemTheme(
	callback: (theme: "light" | "dark") => void,
): () => void {
	if (typeof window === "undefined")
		return () => {
			/* noop */
		};

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	const handler = (e: MediaQueryListEvent) => {
		callback(e.matches ? "dark" : "light");
	};

	mediaQuery.addEventListener("change", handler);
	return () => mediaQuery.removeEventListener("change", handler);
}
