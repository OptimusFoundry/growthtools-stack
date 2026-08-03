import { motion } from "motion/react";
import {
	Children,
	type CSSProperties,
	type ElementType,
	type ReactNode,
	useMemo,
} from "react";
import { useMotionTokens } from "../../../context/MotionProvider";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { staggerContainerVariants, staggerItemVariants } from "../../../motion";
import { cn } from "../../../utils/cn";
import {
	type Breakpoint,
	type Responsive,
	resolveResponsive,
} from "../../../utils/responsive";
import { GridItem } from "../GridItem/GridItem";
import styles from "./Grid.module.scss";

// Maps GridGap token names to CSS space variables
const GAP_TOKEN_MAP: Record<GridGap, string> = {
	"0": "0",
	xs: "var(--space-xs)",
	sm: "var(--space-sm)",
	md: "var(--space-md)",
	lg: "var(--space-lg)",
	xl: "var(--space-xl)",
	"2xl": "var(--space-2xl)",
	"3xl": "var(--space-3xl)",
	"4xl": "var(--space-4xl)",
};

/**
 * Converts a Responsive<GridGap> into CSS custom property key-value pairs,
 * with gap token names resolved to CSS space variable values.
 */
function buildGapVars(
	prefix: string,
	value: Responsive<GridGap> | undefined,
): Record<string, string> {
	if (value === undefined) return {};
	const resolved = resolveResponsive(value);
	const result: Record<string, string> = {};
	for (const [bp, val] of Object.entries(resolved)) {
		if (val !== undefined) {
			result[`${prefix}-${bp}`] = GAP_TOKEN_MAP[val as GridGap] ?? "0";
		}
	}
	return result;
}

/**
 * Converts a Responsive<GridColumns> into CSS custom property key-value pairs.
 * "auto" values are skipped — handled by the .columnsAuto class instead.
 */
function buildColumnVars(
	value: Responsive<GridColumns>,
): Record<string, string> {
	const resolved = resolveResponsive(value);
	const result: Record<string, string> = {};
	for (const [bp, val] of Object.entries(resolved)) {
		if (val !== undefined && val !== "auto") {
			result[`--grid-columns-${bp as Breakpoint}`] = String(val);
		}
	}
	return result;
}

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
	/** Number of columns — supports responsive object e.g. `{{ base: 1, md: 3 }}` */
	columns?: Responsive<GridColumns>;
	/** Gap between items — supports responsive object. */
	gap?: Responsive<GridGap>;
	/** Row gap (overrides gap for rows). */
	rowGap?: Responsive<GridGap>;
	/** Column gap (overrides gap for columns). */
	columnGap?: Responsive<GridGap>;
	/**
	 * When set, the component applies container-type: inline-size and
	 * responsive CSS vars respond to @container queries at the given size threshold.
	 */
	containerQuery?: "sm" | "md" | "lg" | "xl" | "2xl";
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

/**
 * Grid component for CSS grid layouts.
 *
 * Supports responsive column counts and gaps via the Responsive<T> type:
 *
 * @example
 * ```tsx
 * // Fixed columns:
 * <Grid columns="3" gap="md">...</Grid>
 *
 * // Responsive columns:
 * <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap="lg">...</Grid>
 *
 * // With stagger animation:
 * <Grid columns="3" gap="md" animate>...</Grid>
 * ```
 */
export function Grid({
	columns = "auto",
	gap = "md",
	rowGap,
	columnGap,
	containerQuery,
	children,
	as: Component = "div",
	animate = false,
	staggerDelay = 0.05,
	className,
}: GridProps) {
	const prefersReducedMotion = useReducedMotion();
	const shouldAnimate = animate && !prefersReducedMotion;
	const motionTokens = useMotionTokens();
	const itemVariants = useMemo(
		() =>
			staggerItemVariants(
				{ y: 10 },
				motionTokens.duration.normal,
				motionTokens.easeOut,
			),
		[motionTokens],
	);

	// Build CSS custom properties for responsive columns
	const columnVars = buildColumnVars(columns);

	// Build CSS custom properties for responsive gap
	const gapVars = {
		...buildGapVars("--grid-gap", gap),
		...buildGapVars("--grid-row-gap", rowGap),
		...buildGapVars("--grid-col-gap", columnGap),
	};

	// Container query sentinel
	const cqVars = containerQuery ? { "--grid-cq-size": containerQuery } : {};

	const inlineStyle = {
		...columnVars,
		...gapVars,
		...cqVars,
	} as CSSProperties;

	// Detect if any breakpoint resolves to "auto" for the autofit class
	const resolvedColumns = resolveResponsive(columns);
	const hasAutoColumns = Object.values(resolvedColumns).some(
		(v) => v === "auto",
	);

	const gridClassName = cn(
		styles.grid,
		hasAutoColumns && styles.columnsAuto,
		containerQuery && styles.containerQuery,
		className,
	);

	if (shouldAnimate) {
		return (
			<motion.div
				className={gridClassName}
				style={inlineStyle}
				variants={staggerContainerVariants(staggerDelay)}
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
		<Component className={gridClassName} style={inlineStyle}>
			{children}
		</Component>
	);
}

Grid.displayName = "Grid";
Grid.Item = GridItem;
