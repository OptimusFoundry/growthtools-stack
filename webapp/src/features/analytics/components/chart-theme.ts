/**
 * chart-theme.ts
 *
 * Reads CSS custom properties at call time so charts respect the active
 * theme. Import getChartColors() at render time, not at module load.
 */

export interface ChartColors {
	primary: string;
	accent: string;
	border: string;
	fg2: string;
	fg3: string;
	bgSurface: string;
}

export function getChartColors(): ChartColors {
	const s = getComputedStyle(document.documentElement);
	const get = (v: string) => s.getPropertyValue(v).trim() || v;
	return {
		primary: get("--color-primary"),
		accent: get("--color-accent"),
		border: get("--color-border"),
		fg2: get("--color-base-content-secondary"),
		fg3: get("--color-base-content-tertiary"),
		bgSurface: get("--color-surface"),
	};
}

// Shared axis / grid props for Recharts — reduces boilerplate in charts.
export const gridProps = {
	strokeDasharray: "0",
	stroke: "var(--color-border)",
	vertical: false,
} as const;

export const xAxisProps = {
	tick: {
		fontFamily: "var(--font-mono)",
		fontSize: 11,
		textTransform: "uppercase" as const,
		fill: "var(--color-base-content-secondary)",
	},
	axisLine: false,
	tickLine: false,
} as const;

export const yAxisProps = {
	...xAxisProps,
	width: 48,
} as const;
