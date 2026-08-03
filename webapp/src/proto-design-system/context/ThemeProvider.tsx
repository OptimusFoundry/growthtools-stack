import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	applyTheme,
	getSystemTheme,
	subscribeToSystemTheme,
	type ThemeName,
	themes,
} from "../themes/themes";

export interface ThemeContextValue {
	theme: ThemeName;
	setTheme: (theme: ThemeName) => void;
	toggleTheme: () => void;
	systemTheme: "light" | "dark";
	useSystemTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
	children: ReactNode;
	defaultTheme?: ThemeName;
	storageKey?: string;
}

export function ThemeProvider({
	children,
	defaultTheme = "paper",
	storageKey = "proto-theme",
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<ThemeName>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(storageKey);
			// stored-but-no-longer-valid (a cut theme from an older session)
			// falls through to defaultTheme; the persistence effect below
			// rewrites localStorage to the new value next render.
			if (stored && stored in themes) {
				return stored as ThemeName;
			}
		}
		return defaultTheme;
	});

	const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
		getSystemTheme(),
	);

	// Apply theme on mount and when theme changes
	useEffect(() => {
		applyTheme(theme);
		localStorage.setItem(storageKey, theme);
	}, [theme, storageKey]);

	// Subscribe to system theme changes
	useEffect(() => {
		return subscribeToSystemTheme(setSystemTheme);
	}, []);

	const setTheme = useCallback((newTheme: ThemeName) => {
		setThemeState(newTheme);
	}, []);

	const toggleTheme = useCallback(() => {
		setThemeState((current) =>
			themes[current].colorScheme === "dark" ? "paper" : "carbon",
		);
	}, []);

	const useSystemTheme = useCallback(() => {
		setThemeState(systemTheme === "dark" ? "carbon" : "paper");
	}, [systemTheme]);

	return (
		<ThemeContext.Provider
			value={{
				theme,
				setTheme,
				toggleTheme,
				systemTheme,
				useSystemTheme,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}
