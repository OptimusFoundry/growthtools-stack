import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { type Responsive, resolveResponsive } from "../../../utils/responsive";
import styles from "./GridItem.module.scss";

export type GridSpan =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| "full";
export type GridStart = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GridItemProps {
	/**
	 * Number of columns to span.
	 * "full" = span all 12 columns (1 / -1).
	 * Supports responsive object e.g. `{ base: 12, md: 6 }`
	 */
	span?: Responsive<GridSpan>;
	/**
	 * Column start position (1-indexed).
	 * Supports responsive object.
	 */
	start?: Responsive<GridStart>;
	/** HTML element to render */
	as?: ElementType;
	/** Additional className */
	className?: string;
	/** Grid item content */
	children: ReactNode;
}

/** Builds --gi-span-{bp} custom properties from a Responsive<GridSpan> */
function buildSpanVars(
	value: Responsive<GridSpan>,
): Record<string, string | number> {
	const resolved = resolveResponsive(value);
	const result: Record<string, string | number> = {};
	for (const [bp, val] of Object.entries(resolved)) {
		if (val !== undefined) {
			// "full" is mapped to the .gridItemFull class; numeric values become the CSS var
			if (val !== "full") {
				result[`--gi-span-${bp}`] = String(val);
			}
		}
	}
	return result;
}

/** Builds --gi-start-{bp} custom properties from a Responsive<GridStart> */
function buildStartVars(
	value: Responsive<GridStart>,
): Record<string, string | number> {
	const resolved = resolveResponsive(value);
	const result: Record<string, string | number> = {};
	for (const [bp, val] of Object.entries(resolved)) {
		if (val !== undefined) {
			result[`--gi-start-${bp}`] = String(val);
		}
	}
	return result;
}

/**
 * GridItem — a grid column span container for use inside `<Grid>` or `<PageShell>`.
 *
 * Attach as `Grid.Item` for ergonomic usage:
 * ```tsx
 * <Grid columns="12" gap="md">
 *   <Grid.Item span={{ base: 12, md: 6 }}>Left</Grid.Item>
 *   <Grid.Item span={{ base: 12, md: 6 }}>Right</Grid.Item>
 * </Grid>
 * ```
 *
 * Use `as="section"` with `aria-label` for semantic page sections:
 * ```tsx
 * <Grid.Item span={{ base: 12 }} as="section" aria-label="Campaign performance">
 *   <Stack gap="md">...</Stack>
 * </Grid.Item>
 * ```
 */
export function GridItem({
	span,
	start,
	as: Component = "div",
	className,
	children,
	...rest
}: GridItemProps & Record<string, unknown>) {
	const spanVars = span ? buildSpanVars(span) : {};
	const startVars = start ? buildStartVars(start) : {};

	// Detect if any breakpoint uses "full"
	const hasFull = span
		? Object.values(resolveResponsive(span)).some((v) => v === "full")
		: false;

	const inlineStyle = {
		...spanVars,
		...startVars,
	} as CSSProperties;

	return (
		<Component
			className={cn(styles.gridItem, hasFull && styles.gridItemFull, className)}
			style={inlineStyle}
			{...rest}
		>
			{children}
		</Component>
	);
}

GridItem.displayName = "GridItem";
