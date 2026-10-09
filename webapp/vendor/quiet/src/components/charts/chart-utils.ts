import React from "react";
import { cssVar, type TokenName } from "../../styles/tokens.generated";

// Shared plumbing for quiet's hand-rolled SVG charts: scales, ticks, paths, formatting, width.

/** Series colour i (0-based) as a CSS value; 1 is accent, 2 ink, then greys. Past 5 it repeats. */
const SERIES = [
	"--q-chart-series-1",
	"--q-chart-series-2",
	"--q-chart-series-3",
	"--q-chart-series-4",
	"--q-chart-series-5",
] as const satisfies readonly TokenName[];
export const seriesColor = (i: number) => cssVar(SERIES[i % 5]!);
/** Secondary encoding for series 3+ so identity never rests on grey lightness alone. */
export const seriesDash = (i: number) => ["none", "none", "none", "4 3", "1 3"][i % 5]!;

/** Linear scale: domain [d0, d1] → range [r0, r1]. */
export function linear([d0, d1]: readonly [number, number], [r0, r1]: readonly [number, number]) {
	const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
	return (v: number) => r0 + (v - d0) * k;
}

/** About `count` round tick values covering [lo, hi] (1, 2, 2.5, 5 × 10ⁿ steps). */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
	if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0];
	if (lo === hi) {
		hi = lo + 1;
	}
	const raw = (hi - lo) / Math.max(1, count);
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
	const start = Math.floor(lo / step) * step;
	const end = Math.ceil(hi / step) * step;
	const out: number[] = [];
	for (let v = start; v <= end + step / 2; v += step) out.push(Number(v.toFixed(10)));
	return out;
}

/** Value domain that includes zero (bars and areas need a true baseline) and is padded to ticks. */
export function valueDomain(
	values: readonly (number | null | undefined)[],
	{ zero = true, count = 4 }: { zero?: boolean; count?: number } = {},
) {
	const finite = values.filter(Number.isFinite) as number[];
	let lo = finite.length ? Math.min(...finite) : 0;
	let hi = finite.length ? Math.max(...finite) : 1;
	if (zero) {
		lo = Math.min(0, lo);
		hi = Math.max(0, hi);
	}
	const ticks = niceTicks(lo, hi, count);
	return { ticks, domain: [ticks[0]!, ticks[ticks.length - 1]!] as [number, number] };
}

/** SVG path through points [[x, y], …]; gaps (null y) break the line. */
export function linePath(pts: readonly (readonly [number, number | null])[]) {
	let d = "";
	let pen = false;
	for (const [x, y] of pts) {
		if (y == null || Number.isNaN(y)) {
			pen = false;
			continue;
		}
		d += `${(pen ? "L" : "M") + x.toFixed(2)} ${y.toFixed(2)}`;
		pen = true;
	}
	return d;
}

/** Closed area under the line down to `base` (y in px). */
export function areaPath(pts: readonly (readonly [number, number | null])[], base: number) {
	const run = pts.filter(([, y]) => y != null && !Number.isNaN(y));
	if (run.length < 2) return "";
	return (
		linePath(run) +
		`L${run[run.length - 1]![0].toFixed(2)} ${base.toFixed(2)}L${run[0]![0].toFixed(2)} ${base.toFixed(2)}Z`
	);
}

/** Donut segment from angle a0 to a1 (radians, 0 = 12 o'clock, clockwise). */
export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
	const p = (r: number, a: number): [number, number] => [
		cx + r * Math.sin(a),
		cy - r * Math.cos(a),
	];
	const large = a1 - a0 > Math.PI ? 1 : 0;
	if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
	const [x0, y0] = p(r1, a0),
		[x1, y1] = p(r1, a1),
		[x2, y2] = p(r0, a1),
		[x3, y3] = p(r0, a0);
	return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

/** Compact number formatting: 1,240 · 13.2k · 4.1M. */
export function formatNumber(v: number | null | undefined) {
	if (v == null || Number.isNaN(v)) return "–";
	const a = Math.abs(v);
	if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
	if (a >= 1e4) return `${(v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "")}k`;
	return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Measured content width of a container (ResizeObserver); `fallback` before the first measure. */
export function useWidth(fallback = 600): [React.RefObject<HTMLDivElement | null>, number] {
	const ref = React.useRef<HTMLDivElement>(null);
	const [width, setWidth] = React.useState(fallback);
	React.useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => {
			const w = el.clientWidth;
			if (w > 0) setWidth(w);
		};
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return [ref, width];
}

/** Picks ~`count` evenly spaced indices out of n (always first and last). */
export function sparseIndices(n: number, count: number) {
	if (n <= count) return Array.from({ length: n }, (_, i) => i);
	const step = (n - 1) / (count - 1);
	return Array.from({ length: count }, (_, i) => Math.round(i * step));
}
