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
	defaultTheme = "light",
	storageKey = "proto-theme",
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<ThemeName>(() => {
		// Try to get from localStorage first
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(storageKey);
			if (
				stored &&
				(stored === "light" || stored === "dark" || stored === "midnight")
			) {
				return stored;
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
		setThemeState((current) => {
			if (current === "light") return "dark";
			if (current === "dark") return "midnight";
			return "light";
		});
	}, []);

	const useSystemTheme = useCallback(() => {
		setThemeState(systemTheme === "dark" ? "dark" : "light");
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
