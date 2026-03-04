import { AnimatePresence, motion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

export type PageTransitionType = "fade" | "slide" | "scale" | "slideUp";

export interface PageTransitionProps {
	/** Unique key for the current page/content - change this to trigger transition */
	pageKey: string;
	/** Content to display */
	children: ReactNode;
	/** Transition type */
	type?: PageTransitionType;
	/** Transition duration in seconds */
	duration?: number;
	/** Additional className for the wrapper */
	className?: string;
}

const variants: Record<PageTransitionType, Variants> = {
	fade: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
	},
	slide: {
		initial: { opacity: 0, x: 20 },
		animate: { opacity: 1, x: 0 },
		exit: { opacity: 0, x: -20 },
	},
	slideUp: {
		initial: { opacity: 0, y: 10 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -10 },
	},
	scale: {
		initial: { opacity: 0, scale: 0.98 },
		animate: { opacity: 1, scale: 1 },
		exit: { opacity: 0, scale: 0.98 },
	},
};

/**
 * PageTransition component for animating content changes.
 * Wrap content and change the `pageKey` prop to trigger transitions.
 *
 * @example
 * ```tsx
 * const [activeTab, setActiveTab] = useState("home");
 *
 * <PageTransition pageKey={activeTab} type="fade">
 *   {activeTab === "home" && <HomePage />}
 *   {activeTab === "settings" && <SettingsPage />}
 * </PageTransition>
 * ```
 */
export function PageTransition({
	pageKey,
	children,
	type = "fade",
	duration = 0.2,
	className,
}: PageTransitionProps) {
	const prefersReducedMotion = useReducedMotion();

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration, ease: [0, 0, 0.2, 1] };

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={pageKey}
				className={className}
				variants={variants[type]}
				initial="initial"
				animate="animate"
				exit="exit"
				transition={transition}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}

PageTransition.displayName = "PageTransition";
