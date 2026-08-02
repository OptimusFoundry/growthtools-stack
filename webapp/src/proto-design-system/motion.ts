// Static fallback motion values for JS-driven (motion/react) animations —
// the house (light theme) defaults, mirroring tokens/_motion.scss's :root
// values. These are NOT theme-aware: a theme's --duration-*/--ease-*
// overrides never reach a plain `import { DURATION } from "./motion"`,
// because that's a build-time constant, not a live CSS read. Components
// that want to respect a theme's motion personality must use
// `useMotionTokens()` from context/MotionProvider.tsx instead, which reads
// these same tokens live off the DOM and re-reads them on theme change.
// Keep importing EASE_OUT/DURATION directly only for values that
// deliberately should NOT vary by theme (there currently are none — every
// existing use case migrated to useMotionTokens()); prefer the hook.

import type { Easing, Variants } from "motion/react";

/** Mirrors --ease-out: cubic-bezier(0.22, 1, 0.36, 1) — the house ease. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Mirrors --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1). */
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

/** Durations in SECONDS (motion/react units), mirroring the ms duration tokens. */
export const DURATION = {
	fast: 0.15, // --duration-fast   (150ms)
	normal: 0.24, // --duration-normal (240ms)
	slow: 0.4, // --duration-slow   (400ms)
} as const;

/** Container variants for a `motion/react` stagger — children fade/slide in one after another. */
export function staggerContainerVariants(staggerDelay: number): Variants {
	return {
		hidden: { opacity: 1 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: staggerDelay },
		},
	};
}

/** Item variants for a `motion/react` stagger child, offset along x and/or y
 * before settling. `duration`/`ease` are explicit params (not read from the
 * static DURATION/EASE_OUT above) so callers can pass theme-aware values
 * from `useMotionTokens()`. */
export function staggerItemVariants(
	offset: { x?: number; y?: number },
	duration: number = DURATION.normal,
	ease: Easing = EASE_OUT as unknown as Easing,
): Variants {
	return {
		hidden: { opacity: 0, ...offset },
		visible: {
			opacity: 1,
			...(offset.x !== undefined ? { x: 0 } : {}),
			...(offset.y !== undefined ? { y: 0 } : {}),
			transition: { duration, ease },
		},
	};
}
