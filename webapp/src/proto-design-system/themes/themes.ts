// =============================================================================
// THEME REGISTRY
// =============================================================================
// The canonical list of themes available to the product. Each entry here
// corresponds 1:1 with a `[data-theme="<name>"]` block in `themes/_<name>.scss`.
//
// To add a theme:
//   1. Create `themes/_<name>.scss` with the full token set.
//   2. `@use "<name>";` it from `themes/theme.scss`.
//   3. Add a `Theme` entry to `themes` below.
//   4. ThemeProvider + useTheme pick it up automatically.

export type ThemeName =
	| "editorial"
	| "light"
	| "dark"
	| "brutal"
	| "cosmos"
	| "cyberpunk"
	| "sunset"
	| "claude"
	| "ocean"
	| "glow"
	| "fog"
	| "porcelain"
	| "aqua"
	| "archive"
	| "botanical"
	| "carbon"
	| "clinic"
	| "concrete"
	| "flux"
	| "marble"
	| "matrix"
	| "mercury"
	| "moss"
	| "plasma"
	| "punk"
	| "radio"
	| "riso"
	| "vinyl"
	| "zen";

export interface Theme {
	name: ThemeName;
	label: string;
	colorScheme: "light" | "dark";
}

export const themes: Record<ThemeName, Theme> = {
	editorial: { name: "editorial", label: "Editorial", colorScheme: "light" },
	light: { name: "light", label: "Light", colorScheme: "light" },
	dark: { name: "dark", label: "Dark", colorScheme: "dark" },
	brutal: { name: "brutal", label: "Brutal", colorScheme: "light" },
	cosmos: { name: "cosmos", label: "Cosmos", colorScheme: "dark" },
	cyberpunk: { name: "cyberpunk", label: "Cyberpunk", colorScheme: "dark" },
	sunset: { name: "sunset", label: "Sunset", colorScheme: "dark" },
	claude: { name: "claude", label: "Claude", colorScheme: "light" },
	ocean: { name: "ocean", label: "Ocean", colorScheme: "light" },
	glow: { name: "glow", label: "Glow", colorScheme: "dark" },
	fog: { name: "fog", label: "Fog", colorScheme: "light" },
	porcelain: { name: "porcelain", label: "Porcelain", colorScheme: "light" },
	aqua: { name: "aqua", label: "Aqua", colorScheme: "dark" },
	archive: { name: "archive", label: "Archive", colorScheme: "dark" },
	botanical: { name: "botanical", label: "Botanical", colorScheme: "light" },
	carbon: { name: "carbon", label: "Carbon", colorScheme: "dark" },
	clinic: { name: "clinic", label: "Clinic", colorScheme: "light" },
	concrete: { name: "concrete", label: "Concrete", colorScheme: "light" },
	flux: { name: "flux", label: "Flux", colorScheme: "dark" },
	marble: { name: "marble", label: "Marble", colorScheme: "light" },
	matrix: { name: "matrix", label: "Matrix", colorScheme: "dark" },
	mercury: { name: "mercury", label: "Mercury", colorScheme: "dark" },
	moss: { name: "moss", label: "Moss", colorScheme: "dark" },
	plasma: { name: "plasma", label: "Plasma", colorScheme: "dark" },
	punk: { name: "punk", label: "Punk", colorScheme: "light" },
	radio: { name: "radio", label: "Radio", colorScheme: "dark" },
	riso: { name: "riso", label: "Riso", colorScheme: "light" },
	vinyl: { name: "vinyl", label: "Vinyl", colorScheme: "dark" },
	zen: { name: "zen", label: "Zen", colorScheme: "light" },
};

export const themeNames = Object.keys(themes) as ThemeName[];

/**
 * Applies a theme to the document.
 */
export function applyTheme(theme: ThemeName): void {
	document.documentElement.setAttribute("data-theme", theme);

	// Update color-scheme meta for system UI (scrollbars, form controls, etc.)
	const colorScheme = themes[theme].colorScheme;
	document.documentElement.style.colorScheme = colorScheme;
}

/**
 * Gets the currently active theme.
 */
export function getCurrentTheme(): ThemeName {
	const theme = document.documentElement.getAttribute(
		"data-theme",
	) as ThemeName | null;
	return theme && theme in themes ? theme : "editorial";
}

/**
 * Gets the system preferred color scheme.
 */
export function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Subscribes to system theme changes.
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
