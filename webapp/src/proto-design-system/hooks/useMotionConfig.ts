import { useReducedMotion } from "./useReducedMotion";

export interface SpringConfig {
	type: "spring";
	stiffness: number;
	damping: number;
	mass: number;
}

export interface MotionConfig {
	springConfig: SpringConfig;
	duration: number;
	reducedMotion: boolean;
}

const springPresets = {
	bouncy: { stiffness: 300, damping: 10, mass: 1 },
	gentle: { stiffness: 120, damping: 14, mass: 1 },
	wobbly: { stiffness: 180, damping: 12, mass: 1 },
	stiff: { stiffness: 400, damping: 30, mass: 1 },
	slow: { stiffness: 100, damping: 20, mass: 1 },
} as const;

export type SpringPreset = keyof typeof springPresets;

/**
 * Hook to get motion.dev configuration based on user preferences
 */
export function useMotionConfig(preset: SpringPreset = "gentle"): MotionConfig {
	const reducedMotion = useReducedMotion();

	const springConfig: SpringConfig = {
		type: "spring",
		...springPresets[preset],
	};

	// If reduced motion is preferred, use instant transitions
	if (reducedMotion) {
		return {
			springConfig: { type: "spring", stiffness: 1000, damping: 100, mass: 1 },
			duration: 0,
			reducedMotion: true,
		};
	}

	return {
		springConfig,
		duration: 200,
		reducedMotion: false,
	};
}

/**
 * Get animation variants that respect reduced motion
 */
export function useAnimationVariants<T extends Record<string, unknown>>(
	variants: T,
	reducedVariants?: Partial<T>,
): T {
	const reducedMotion = useReducedMotion();

	if (reducedMotion && reducedVariants) {
		return { ...variants, ...reducedVariants };
	}

	return variants;
}
