import {
	Children,
	type ElementType,
	isValidElement,
	type ReactNode,
} from "react";
import { cn } from "../../../utils/cn";
import { Grid } from "../Grid/Grid";
import { GridItem } from "../GridItem/GridItem";
import styles from "./PageShell.module.scss";

export type PageShellVariant = "default" | "narrow" | "full";

export interface PageShellProps {
	/**
	 * Layout variant.
	 * - `default` — max-width 1280px (`--max-width-7xl`)
	 * - `narrow` — max-width 1024px (`--max-width-5xl`), for auth-style pages
	 * - `full` — no max-width, for full-bleed surfaces
	 */
	variant?: PageShellVariant;
	/** HTML element to render (defaults to "div") */
	as?: ElementType;
	/** Additional className */
	className?: string;
	/** Page content. Direct children that are not GridItem are auto-wrapped in `<GridItem span={{ base: 12 }}>`. */
	children: ReactNode;
	/** Enable stagger animation for page sections */
	animate?: boolean;
}

/**
 * PageShell — the standard page container for product routes.
 *
 * Implements a 12-column Swiss-style grid with page-level padding tokens.
 * Direct children that are not `Grid.Item` / `GridItem` are auto-wrapped
 * in `<GridItem span={{ base: 12 }}>` for convenience.
 *
 * For explicit multi-column layouts, wrap children in `<Grid.Item>`:
 *
 * @example
 * ```tsx
 * // Full-width sections (auto-wrapped):
 * <PageShell>
 *   <PageHero title="My Page" />
 *   <SomeSection />
 * </PageShell>
 *
 * // Explicit column control:
 * <PageShell>
 *   <Grid.Item span={{ base: 12, md: 6 }}>Left</Grid.Item>
 *   <Grid.Item span={{ base: 12, md: 6 }}>Right</Grid.Item>
 * </PageShell>
 *
 * // Sidebar + main:
 * <PageShell>
 *   <Grid.Item span={{ base: 12, lg: 3 }} as="nav">Sidebar</Grid.Item>
 *   <Grid.Item span={{ base: 12, lg: 9 }} as="main">Content</Grid.Item>
 * </PageShell>
 * ```
 *
 * **Do NOT nest PageShell inside PageShell** — padding doubles.
 *
 * **Tab-shell convention:** When a route renders only Topbar + TabNav + Outlet,
 * it is a tab-shell and does NOT get PageShell. Apply PageShell inside the
 * feature component rendered into the Outlet.
 */
export function PageShell({
	variant = "default",
	as: Component = "div",
	className,
	children,
	animate = false,
}: PageShellProps) {
	// Auto-wrap direct children that are not already GridItem
	const wrappedChildren = Children.map(children, (child) => {
		if (
			isValidElement(child) &&
			(child.type as { displayName?: string }).displayName === "GridItem"
		) {
			return child;
		}
		return <GridItem span={{ base: 12 }}>{child}</GridItem>;
	});

	// gap/rowGap/columnGap are NOT passed — the .shell CSS class handles all
	// page-level spacing via --page-section-gap and --page-grid-gap tokens.
	//
	// `animate` is intentionally NOT forwarded to Grid: Grid's animate path
	// wraps each child in a <motion.div>, which becomes a 1-col grid item
	// (no `grid-column: span 12` on the wrapper) and breaks the auto-wrapped
	// GridItems' span. Use a CSS-only page-level fade-in instead.
	return (
		<Grid
			columns="12"
			as={Component}
			className={cn(
				styles.shell,
				styles[`variant-${variant}`],
				animate && styles.animateFadeIn,
				className,
			)}
		>
			{wrappedChildren}
		</Grid>
	);
}

PageShell.displayName = "PageShell";
