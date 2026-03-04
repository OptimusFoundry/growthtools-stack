import { useEffect, useState } from "react";

/**
 * Hook to match media queries
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia(query).matches;
	});

	useEffect(() => {
		const mediaQuery = window.matchMedia(query);

		const handleChange = (event: MediaQueryListEvent) => {
			setMatches(event.matches);
		};

		// Set initial value
		setMatches(mediaQuery.matches);

		// Listen for changes
		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [query]);

	return matches;
}

// Preset breakpoint hooks
export function useIsMobile(): boolean {
	return useMediaQuery("(max-width: 639px)");
}

export function useIsTablet(): boolean {
	return useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
}

export function useIsDesktop(): boolean {
	return useMediaQuery("(min-width: 1024px)");
}
