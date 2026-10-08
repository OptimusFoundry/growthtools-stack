import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { type LinkComponent, LinkProvider } from "../../lib/link";
import { applyTheme, defaultTheme, resolveTheme, type ThemeName, themes } from "./themes";

const STORAGE_KEY = "quiet-theme";

interface ThemeContextValue {
	theme: ThemeName;
	setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function stored(): ThemeName | null {
	try {
		const t = localStorage.getItem(STORAGE_KEY);
		return t && Object.hasOwn(themes, t) ? t : null;
	} catch {
		return null;
	}
}

/**
 * App-level theme: marks <html> as quiet-owned, applies data-theme and remembers the choice.
 * Accepts any registered theme (defineThemes); an unregistered name falls back to defaultTheme.
 */
export function ThemeProvider({
	defaultValue = defaultTheme,
	linkComponent,
	children,
}: {
	defaultValue?: ThemeName;
	/** Router link for every component that renders an `<a>` from an in-app `href`. */
	linkComponent?: LinkComponent;
	children: ReactNode;
}) {
	const [theme, setThemeState] = useState<ThemeName>(() => stored() ?? resolveTheme(defaultValue));
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);
	const setTheme = useCallback((next: ThemeName) => {
		const resolved = resolveTheme(next);
		setThemeState(resolved);
		try {
			localStorage.setItem(STORAGE_KEY, resolved);
		} catch {
			// Storage can be unavailable (private mode); the theme still applies for this session.
		}
	}, []);
	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			<LinkProvider value={linkComponent}>{children}</LinkProvider>
		</ThemeContext.Provider>
	);
}

/** The enclosing ThemeProvider's theme, or null outside one. */
export function useProviderTheme(): ThemeName | null {
	return useContext(ThemeContext)?.theme ?? null;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
	return ctx;
}
