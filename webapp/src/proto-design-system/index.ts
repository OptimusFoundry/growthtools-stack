// =============================================================================
// PROTO DESIGN SYSTEM - PUBLIC API
// =============================================================================

export {
	type MotionContextValue,
	MotionProvider,
	type MotionProviderProps,
	useMotionContext,
} from "./context/MotionProvider";
// Context Providers
export {
	type ThemeContextValue,
	ThemeProvider,
	type ThemeProviderProps,
} from "./context/ThemeProvider";
export { useClickOutside } from "./hooks/useClickOutside";
export { useFocusTrap } from "./hooks/useFocusTrap";
export {
	useIsDesktop,
	useIsMobile,
	useIsTablet,
	useMediaQuery,
} from "./hooks/useMediaQuery";
export {
	type MotionConfig,
	type SpringConfig,
	type SpringPreset,
	useAnimationVariants,
	useMotionConfig,
} from "./hooks/useMotionConfig";
export { useReducedMotion } from "./hooks/useReducedMotion";
// Hooks
export { useTheme } from "./hooks/useTheme";
// Theme utilities
export {
	applyTheme,
	getCurrentTheme,
	getSystemTheme,
	subscribeToSystemTheme,
	type Theme,
	type ThemeName,
	themeNames,
	themes,
} from "./themes/themes";
export {
	announce,
	aria,
	generateId,
	getFocusableElements,
	isVisible,
	prefersDarkMode,
	prefersHighContrast,
	prefersReducedMotion,
} from "./utils/a11y";
// Utilities
export { cn } from "./utils/cn";
export {
	getToken,
	getTokens,
	removeToken,
	setToken,
	tokenVar,
} from "./utils/tokens";
