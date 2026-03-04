import { useEffect, useState } from "react";

/**
 * Hook to detect user's reduced motion preference
 */
export function useReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		const handleChange = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches);
		};

		// Set initial value
		setPrefersReducedMotion(mediaQuery.matches);

		// Listen for changes
		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, []);

	return prefersReducedMotion;
}
