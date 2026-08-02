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
import { type Responsive, resolveResponsive } from "../../../utils/responsive";
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

// Maps StackSpacing token names to CSS space variables
const SPACING_TOKEN_MAP: Record<StackSpacing, string> = {
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

// Maps StackAlign to CSS align-items values
const ALIGN_MAP: Record<StackAlign, string> = {
	start: "flex-start",
	center: "center",
	end: "flex-end",
	stretch: "stretch",
	baseline: "baseline",
};

// Maps StackJustify to CSS justify-content values
const JUSTIFY_MAP: Record<StackJustify, string> = {
	start: "flex-start",
	center: "center",
	end: "flex-end",
	between: "space-between",
	around: "space-around",
	evenly: "space-evenly",
};

export interface StackProps {
	/** Flex direction — supports responsive object e.g. `{{ base: "column", md: "row" }}` */
	direction?: Responsive<StackDirection>;
	/** Align items — supports responsive object */
	align?: Responsive<StackAlign>;
	/** Justify content — supports responsive object */
	justify?: Responsive<StackJustify>;
	/** Gap between items — supports responsive object */
	gap?: Responsive<StackSpacing>;
	/** Allow items to wrap — supports responsive object */
	wrap?: Responsive<boolean>;
	/**
	 * When set, the component applies container-type: inline-size and
	 * responsive CSS vars respond to @container queries at the given size threshold.
	 */
	containerQuery?: "sm" | "md" | "lg" | "xl" | "2xl";
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

/** Build CSS custom properties for a Responsive<string> value at each breakpoint */
function buildStringVars(
	prefix: string,
	value: Responsive<string> | undefined,
): Record<string, string> {
	if (value === undefined) return {};
	const resolved = resolveResponsive(value);
	const result: Record<string, string> = {};
	for (const [bp, val] of Object.entries(resolved)) {
		if (val !== undefined) {
			result[`${prefix}-${bp}`] = String(val);
		}
	}
	return result;
}

/**
 * Stack component for flexible layouts with consistent spacing.
 *
 * Supports responsive direction, gap, align and justify via the Responsive<T> type:
 *
 * @example
 * ```tsx
 * // Fixed direction:
 * <Stack direction="row" gap="md" align="center">
 *   <Button>One</Button>
 *   <Button>Two</Button>
 * </Stack>
 *
 * // Responsive direction (column on mobile, row on desktop):
 * <Stack direction={{ base: "column", md: "row" }} gap="lg" align={{ base: "stretch", md: "center" }}>
 *   <Card>Left</Card>
 *   <Card>Right</Card>
 * </Stack>
 *
 * // With stagger animation:
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
	containerQuery,
	children,
	as: Component = "div",
	animate = false,
	staggerDelay = 0.1,
	className,
	style,
}: StackProps) {
	const prefersReducedMotion = useReducedMotion();
	const shouldAnimate = animate && !prefersReducedMotion;
	const motionTokens = useMotionTokens();
	const itemVariants = useMemo(
		() =>
			staggerItemVariants(
				{ y: 12 },
				motionTokens.duration.normal,
				motionTokens.easeOut,
			),
		[motionTokens],
	);

	// Build responsive CSS custom properties
	// Direction
	const directionVars = buildStringVars(
		"--stack-direction",
		resolveResponsiveValues(direction),
	);

	// Align — map to CSS values
	const alignVars = align
		? buildStringVars(
				"--stack-align",
				mapResponsive(align, (v) => ALIGN_MAP[v]),
			)
		: {};

	// Justify — map to CSS values
	const justifyVars = justify
		? buildStringVars(
				"--stack-justify",
				mapResponsive(justify, (v) => JUSTIFY_MAP[v]),
			)
		: {};

	// Gap — map to CSS space token values
	const gapVars = buildStringVars(
		"--stack-gap",
		mapResponsive(gap, (v) => SPACING_TOKEN_MAP[v]),
	);

	// Wrap
	const wrapVars = buildStringVars(
		"--stack-wrap",
		mapResponsive(wrap, (v) => (v ? "wrap" : "nowrap")),
	);

	// Container query sentinel
	const cqVars = containerQuery ? { "--stack-cq-size": containerQuery } : {};

	const computedStyle: CSSProperties = {
		...directionVars,
		...alignVars,
		...justifyVars,
		...gapVars,
		...wrapVars,
		...cqVars,
		...style,
	} as CSSProperties;

	const stackClassName = cn(
		styles.stack,
		containerQuery && styles.containerQuery,
		className,
	);

	if (shouldAnimate) {
		return (
			<motion.div
				className={stackClassName}
				style={computedStyle}
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
		<Component className={stackClassName} style={computedStyle}>
			{children}
		</Component>
	);
}

Stack.displayName = "Stack";

// =============================================================================
// HELPERS
// =============================================================================

/** Convert a Responsive<T> to Responsive<string> by mapping each value */
function mapResponsive<T>(
	value: Responsive<T>,
	mapper: (v: T) => string,
): Responsive<string> {
	const resolved = resolveResponsive(value);
	const result: Partial<Record<string, string>> = {};
	for (const [bp, val] of Object.entries(resolved)) {
		if (val !== undefined) {
			result[bp] = mapper(val as T);
		}
	}
	return result as Responsive<string>;
}

/** Convert a Responsive<StackDirection> to a flat Responsive<string> */
function resolveResponsiveValues(
	value: Responsive<StackDirection>,
): Responsive<string> {
	return mapResponsive(value, (v) => v);
}
