import { isDev } from "../../lib/env";
// Theme registry. A theme is a [data-theme] block in @layer q.themes that sets the tier-1 palette
// (and may override tier-2/3 tokens). quiet ships foundry and foundry-dark; products register
// their own at startup with defineThemes(), so a theme can live in the product's repo.

export interface ThemeDefinition {
	label: string;
	colorScheme: "light" | "dark";
}

const builtInThemes = {
	foundry: { label: "Foundry", colorScheme: "light" },
	"foundry-dark": { label: "Foundry dark", colorScheme: "dark" },
} as const satisfies Record<string, ThemeDefinition>;

export type BuiltInTheme = keyof typeof builtInThemes;
// `string & {}` keeps the built-in names in autocomplete while accepting any registered name.
export type ThemeName = BuiltInTheme | (string & {});

export const defaultTheme: BuiltInTheme = "foundry";

// Null prototype, so names like "toString" or "__proto__" are never mistaken for themes.
/** Every registered theme. Live: defineThemes() adds to it. */
export const themes: Record<string, ThemeDefinition> = Object.assign(
	Object.create(null),
	builtInThemes,
);
/** Every registered theme name, in registration order. Live: defineThemes() adds to it. */
export const themeNames: ThemeName[] = Object.keys(themes);

/**
 * Registers product themes. Call once at startup, before the first render. Loading each theme's
 * CSS (`[data-theme="<name>"]` inside `@layer q.themes`) is the product's job.
 */
export function defineThemes(definitions: Record<string, ThemeDefinition>): void {
	for (const [name, { label, colorScheme }] of Object.entries(definitions)) {
		if (!Object.hasOwn(themes, name)) themeNames.push(name);
		themes[name] = { label, colorScheme };
	}
}

declare const process: { env: { NODE_ENV?: string } } | undefined;
const warned = new Set<string>();

/** `theme` if it is registered, otherwise defaultTheme — warning once per name in dev. */
export function resolveTheme(theme: ThemeName | null | undefined): ThemeName {
	if (theme != null && Object.hasOwn(themes, theme)) return theme;
	const dev = isDev();
	if (theme != null && dev && !warned.has(theme)) {
		warned.add(theme);
		console.warn(
			`quiet: theme "${theme}" is not registered, so "${defaultTheme}" is used. Register it with defineThemes().`,
		);
	}
	return defaultTheme;
}

/** The resolved name and definition for `theme` (see resolveTheme). */
export function getTheme(
	theme: ThemeName | null | undefined,
): ThemeDefinition & { name: ThemeName } {
	const name = resolveTheme(theme);
	return { name, ...(themes[name] ?? builtInThemes[defaultTheme]) };
}

/**
 * Applies a theme to an element (default: the document root) and returns the theme it applied.
 * `data-quiet` marks the element as quiet-owned, so quiet's base styles and reference-compat names
 * reach it and its subtree.
 */
export function applyTheme(
	theme: ThemeName,
	el: HTMLElement = document.documentElement,
): ThemeName {
	const { name, colorScheme } = getTheme(theme);
	el.setAttribute("data-quiet", "");
	el.setAttribute("data-theme", name);
	el.style.colorScheme = colorScheme;
	return name;
}
