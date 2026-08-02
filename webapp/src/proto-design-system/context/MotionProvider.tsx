import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
	FALLBACK_MOTION_TOKENS,
	type MotionTokens,
	readMotionTokensFromDOM,
} from "../utils/parseMotionTokens";

export interface MotionContextValue {
	reducedMotion: boolean;
	tokens: MotionTokens;
}

const MotionContext = createContext<MotionContextValue | null>(null);

export interface MotionProviderProps {
	children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
	const reducedMotion = useReducedMotion();
	const [tokens, setTokens] = useState<MotionTokens>(() =>
		readMotionTokensFromDOM(),
	);

	// Themes are applied by setting data-theme on <html> (applyTheme() in
	// themes.ts), which this app's ThemeProvider drives via React state — but
	// Storybook applies the same attribute directly, outside that context.
	// Watching the DOM attribute instead of consuming ThemeProvider keeps this
	// provider correct in both places without depending on which one changed it.
	useEffect(() => {
		setTokens(readMotionTokensFromDOM());

		const observer = new MutationObserver(() => {
			setTokens(readMotionTokensFromDOM());
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	}, []);

	return (
		<MotionContext.Provider value={{ reducedMotion, tokens }}>
			{children}
		</MotionContext.Provider>
	);
}

export function useMotionContext(): MotionContextValue {
	const context = useContext(MotionContext);

	if (!context) {
		throw new Error("useMotionContext must be used within a MotionProvider");
	}

	return context;
}

/** Theme-aware duration/easing/spring values for `motion/react` components.
 * Safe outside a MotionProvider (returns the static house defaults) — use
 * this instead of importing DURATION/EASE_OUT directly from motion.ts, which
 * can never reflect a theme's motion overrides. */
export function useMotionTokens(): MotionTokens {
	const context = useContext(MotionContext);
	return context?.tokens ?? FALLBACK_MOTION_TOKENS;
}
