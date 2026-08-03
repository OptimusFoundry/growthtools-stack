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
	| "ember"
	| "mono"
	| "dark"
	| "brutal"
	| "cosmos"
	| "cyberpunk"
	| "sunset"
	| "glow"
	| "archive"
	| "botanical"
	| "carbon"
	| "concrete"
	| "flux"
	| "matrix"
	| "mercury"
	| "moss"
	| "plasma"
	| "radio"
	| "riso"
	| "vinyl"
	| "zen"
	| "bioluminescent"
	| "blueprint"
	| "candy"
	| "forest"
	| "forest-light"
	| "lavender"
	| "midnight"
	| "monochrome"
	| "neon"
	| "paper"
	| "pixel"
	| "terminal"
	| "whisper";

export interface Theme {
	name: ThemeName;
	label: string;
	colorScheme: "light" | "dark";
	/**
	 * Optional CSS2 stylesheet URL (Google Fonts or another free CDN) for this
	 * theme's bespoke font pairing. Omit to stay on the house Geist/Geist Mono
	 * stack already loaded in index.html. When set, ThemeProvider swaps this
	 * stylesheet in/out on theme change instead of preloading every theme's
	 * fonts up front — see `syncThemeFonts` below.
	 */
	googleFontsHref?: string;
}

export const themes: Record<ThemeName, Theme> = {
	ember: {
		name: "ember",
		label: "Ember",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&family=Chivo+Mono:ital,wght@0,100..900;1,100..900&display=swap",
	},
	mono: {
		name: "mono",
		label: "Teletype",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",
	},
	dark: { name: "dark", label: "Dark", colorScheme: "dark" },
	brutal: {
		name: "brutal",
		label: "Brutal",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Martian+Mono:wght@400;500;600;700&display=swap",
	},
	cosmos: {
		name: "cosmos",
		label: "Cosmos",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,100..900;1,100..900&family=Victor+Mono:ital,wght@0,100..700;1,100..700&display=swap",
	},
	cyberpunk: {
		name: "cyberpunk",
		label: "Cyberpunk",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
	},
	sunset: {
		name: "sunset",
		label: "Sunset",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Onest:wght@100..900&family=Reddit+Mono:wght@200..900&display=swap",
	},
	glow: {
		name: "glow",
		label: "Glow",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
	},
	archive: {
		name: "archive",
		label: "Archive",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap",
	},
	botanical: {
		name: "botanical",
		label: "Botanical",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap",
	},
	carbon: {
		name: "carbon",
		label: "Carbon",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap",
	},
	concrete: {
		name: "concrete",
		label: "Concrete",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
	},
	flux: {
		name: "flux",
		label: "Flux",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600;700&display=swap",
	},
	matrix: {
		name: "matrix",
		label: "Matrix",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap",
	},
	mercury: {
		name: "mercury",
		label: "Mercury",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600;700&display=swap",
	},
	moss: {
		name: "moss",
		label: "Moss",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&family=PT+Mono&display=swap",
	},
	plasma: {
		name: "plasma",
		label: "Plasma",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
	},
	radio: {
		name: "radio",
		label: "Radio",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
	},
	riso: {
		name: "riso",
		label: "Riso",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
	},
	vinyl: {
		name: "vinyl",
		label: "Vinyl",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&family=Overpass+Mono:wght@400;500;600;700&display=swap",
	},
	zen: {
		name: "zen",
		label: "Zen",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
	},
	bioluminescent: {
		name: "bioluminescent",
		label: "Bioluminescent",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700&family=Azeret+Mono:wght@400;500;600;700&display=swap",
	},
	blueprint: {
		name: "blueprint",
		label: "Blueprint",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap",
	},
	candy: {
		name: "candy",
		label: "Candy",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap",
	},
	forest: {
		name: "forest",
		label: "Forest",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap",
	},
	"forest-light": {
		name: "forest-light",
		label: "Forest Light",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&family=Fira+Mono:wght@400;500;700&display=swap",
	},
	lavender: {
		name: "lavender",
		label: "Lavender",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Kode+Mono:wght@400;500;600;700&display=swap",
	},
	midnight: {
		name: "midnight",
		label: "Midnight",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Geologica:wght@100..900&family=B612+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap",
	},
	monochrome: {
		name: "monochrome",
		label: "Monochrome",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Noto+Sans+Mono:wght@400;500;600;700&display=swap",
	},
	neon: {
		name: "neon",
		label: "Neon",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Ubuntu+Mono:wght@400;700&display=swap",
	},
	paper: {
		name: "paper",
		label: "Paper",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap",
	},
	pixel: { name: "pixel", label: "Pixel", colorScheme: "light" },
	terminal: {
		name: "terminal",
		label: "Terminal",
		colorScheme: "dark",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;500;600;700&display=swap",
	},
	whisper: {
		name: "whisper",
		label: "Whisper",
		colorScheme: "light",
		googleFontsHref:
			"https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;500;600&family=Fragment+Mono:ital@0;1&display=swap",
	},
};

export const themeNames = Object.keys(themes) as ThemeName[];

const THEME_FONT_LINK_ID = "theme-google-fonts";

/**
 * Swaps in the active theme's bespoke font stylesheet, if it has one. Themes
 * without `googleFontsHref` fall back to the house Geist/Geist Mono stack
 * already linked in index.html — the 46-theme set never preloads every
 * theme's fonts at once.
 */
function syncThemeFonts(theme: ThemeName): void {
	const href = themes[theme].googleFontsHref;
	const existing = document.getElementById(
		THEME_FONT_LINK_ID,
	) as HTMLLinkElement | null;

	if (!href) {
		existing?.remove();
		return;
	}
	if (existing) {
		if (existing.href !== href) existing.href = href;
		return;
	}
	const link = document.createElement("link");
	link.id = THEME_FONT_LINK_ID;
	link.rel = "stylesheet";
	link.href = href;
	document.head.appendChild(link);
}

/**
 * Applies a theme to the document.
 */
export function applyTheme(theme: ThemeName): void {
	document.documentElement.setAttribute("data-theme", theme);

	// Update color-scheme meta for system UI (scrollbars, form controls, etc.)
	const colorScheme = themes[theme].colorScheme;
	document.documentElement.style.colorScheme = colorScheme;
	syncThemeFonts(theme);
}

/**
 * Gets the currently active theme.
 */
export function getCurrentTheme(): ThemeName {
	const theme = document.documentElement.getAttribute(
		"data-theme",
	) as ThemeName | null;
	return theme && theme in themes ? theme : "paper";
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
