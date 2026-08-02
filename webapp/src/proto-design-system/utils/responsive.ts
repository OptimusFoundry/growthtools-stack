// =============================================================================
// RESPONSIVE UTILITY
// =============================================================================
// Responsive<T> — a value that can be set per breakpoint.
// Keys match the $breakpoints map in _breakpoints.scss.

export type Breakpoint = "base" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * A value that can be a single value applied at all breakpoints,
 * or an object keyed by breakpoint name for responsive overrides.
 *
 * @example
 * // Fixed value:
 * columns="3"
 *
 * // Responsive:
 * columns={{ base: 1, sm: 2, lg: 4 }}
 */
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

/** Type guard — returns true when value is a breakpoint-keyed object */
export function isResponsiveObject<T>(
	value: Responsive<T>,
): value is Partial<Record<Breakpoint, T>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolve a Responsive<T> into a flat record keyed by breakpoint.
 * A scalar value is promoted to `{ base: value }`.
 */
export function resolveResponsive<T>(
	value: Responsive<T>,
): Partial<Record<Breakpoint, T>> {
	if (!isResponsiveObject(value)) return { base: value };
	return value;
}

/**
 * Build inline CSS custom property object from a Responsive value.
 * E.g. resolveResponsive({ base: 2, md: 4 }) with prefix "--grid-columns"
 * → { "--grid-columns-base": "2", "--grid-columns-md": "4" }
 */
export function buildResponsiveCssVars<T>(
	prefix: string,
	value: Responsive<T> | undefined,
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
