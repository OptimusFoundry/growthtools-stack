import { motion, type Variants } from "motion/react";
import { Children, type ElementType, type ReactNode } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Grid.module.scss";

export type GridColumns = "1" | "2" | "3" | "4" | "5" | "6" | "12" | "auto";
export type GridGap =
	| "0"
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl";

export interface GridProps {
	/** Number of columns */
	columns?: GridColumns;
	/** Gap between items */
	gap?: GridGap;
	/** Row gap (overrides gap for rows) */
	rowGap?: GridGap;
	/** Column gap (overrides gap for columns) */
	columnGap?: GridGap;
	/** Grid content */
	children: ReactNode;
	/** HTML element to render */
	as?: ElementType;
	/** Enable stagger animation for grid items */
	animate?: boolean;
	/** Stagger delay between items in seconds */
	staggerDelay?: number;
	/** Additional className */
	className?: string;
}

// Animation variants for stagger effect
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
	},
};

/**
 * Grid component for CSS grid layouts.
 *
 * @example
 * ```tsx
 * <Grid columns="3" gap="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 *
 * // With stagger animation
 * <Grid columns="3" gap="md" animate>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * ```
 */
export function Grid({
	columns = "auto",
	gap = "md",
	rowGap,
	columnGap,
	children,
	as: Component = "div",
	animate = false,
	staggerDelay = 0.05,
	className,
}: GridProps) {
	const prefersReducedMotion = useReducedMotion();
	const shouldAnimate = animate && !prefersReducedMotion;

	const gridClassName = cn(
		styles.grid,
		styles[`columns-${columns}`],
		!rowGap && !columnGap && styles[`gap-${gap}`],
		rowGap && styles[`row-gap-${rowGap}`],
		columnGap && styles[`column-gap-${columnGap}`],
		className,
	);

	if (shouldAnimate) {
		const customGridVariants: Variants = {
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
				className={gridClassName}
				variants={customGridVariants}
				initial="hidden"
				animate="visible"
			>
				{Children.map(children, (child) => (
					<motion.div variants={itemVariants}>{child}</motion.div>
				))}
			</motion.div>
		);
	}

	return <Component className={gridClassName}>{children}</Component>;
}

Grid.displayName = "Grid";
