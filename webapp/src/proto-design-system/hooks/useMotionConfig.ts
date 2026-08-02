import { useMotionTokens } from "../context/MotionProvider";
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

export type SpringPreset = "bouncy" | "gentle" | "wobbly" | "stiff" | "slow";

/**
 * Hook to get motion.dev configuration based on user preferences. Spring
 * presets and duration come from `useMotionTokens()` (the live spring/
 * duration tokens for the active theme), not hardcoded values — a theme
 * can now genuinely change how a button press feels.
 */
export function useMotionConfig(preset: SpringPreset = "gentle"): MotionConfig {
	const reducedMotion = useReducedMotion();
	const motionTokens = useMotionTokens();

	const springConfig: SpringConfig = {
		type: "spring",
		...motionTokens.spring[preset],
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
		duration: motionTokens.duration.normal * 1000, // this hook's public API is ms, motionTokens is seconds
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
