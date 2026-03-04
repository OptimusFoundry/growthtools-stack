import { useContext } from "react";
import { ThemeContext } from "../context/ThemeProvider";

/**
 * Hook to access theme state and controls
 */
export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}

	return context;
}
