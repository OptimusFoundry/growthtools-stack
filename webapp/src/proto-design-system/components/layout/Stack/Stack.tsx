import { motion, type Variants } from "motion/react";
import {
	Children,
	type CSSProperties,
	type ElementType,
	type ReactNode,
} from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Stack.module.scss";

export type StackDirection =
	| "row"
	| "column"
	| "row-reverse"
	| "column-reverse";
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify =
	| "start"
	| "center"
	| "end"
	| "between"
	| "around"
	| "evenly";
export type StackSpacing =
	| "0"
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl";

export interface StackProps {
	/** Flex direction */
	direction?: StackDirection;
	/** Align items */
	align?: StackAlign;
	/** Justify content */
	justify?: StackJustify;
	/** Gap between items */
	gap?: StackSpacing;
	/** Allow items to wrap */
	wrap?: boolean;
	/** Stack content */
	children: ReactNode;
	/** HTML element to render */
	as?: ElementType;
	/** Enable stagger animation for stack items */
	animate?: boolean;
	/** Stagger delay between items in seconds */
	staggerDelay?: number;
	/** Additional className */
	className?: string;
	/** Inline styles */
	style?: CSSProperties;
}

// Animation variants for stagger effect
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 12 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.25, ease: [0, 0, 0.2, 1] },
	},
};

/**
 * Stack component for flexible layouts with consistent spacing.
 *
 * @example
 * ```tsx
 * <Stack direction="row" gap="md" align="center">
 *   <Button>One</Button>
 *   <Button>Two</Button>
 * </Stack>
 *
 * // With stagger animation
 * <Stack gap="lg" animate>
 *   <Card>First</Card>
 *   <Card>Second</Card>
 * </Stack>
 * ```
 */
export function Stack({
	direction = "column",
	align,
	justify,
	gap = "md",
	wrap = false,
	children,
	as: Component = "div",
	animate = false,
	staggerDelay = 0.1,
	className,
	style,
}: StackProps) {
	const prefersReducedMotion = useReducedMotion();
	const shouldAnimate = animate && !prefersReducedMotion;

	const stackClassName = cn(
		styles.stack,
		styles[`direction-${direction}`],
		align && styles[`align-${align}`],
		justify && styles[`justify-${justify}`],
		styles[`gap-${gap}`],
		wrap && styles.wrap,
		className,
	);

	if (shouldAnimate) {
		const containerVariants: Variants = {
			hidden: { opacity: 1 },
			visible: {
				opacity: 1,
				transition: {
					staggerChildren: staggerDelay,
				},
			},
		};

		return (
			<motion.div
				className={stackClassName}
				style={style}
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				{Children.map(children, (child) => (
					<motion.div variants={itemVariants}>{child}</motion.div>
				))}
			</motion.div>
		);
	}

	return (
		<Component className={stackClassName} style={style}>
			{children}
		</Component>
	);
}

Stack.displayName = "Stack";
