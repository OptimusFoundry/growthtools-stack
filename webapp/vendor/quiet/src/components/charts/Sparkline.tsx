import type React from "react";
import { areaPath, formatNumber, linear, linePath } from "./chart-utils";
import "./chart.scss";
import "./Sparkline.scss";

/**
 * A word-sized trend for KPIs and table cells. Molten by default with the last point dotted;
 * read out as one sentence (from, to, low, high).
 * @startingPoint section="Charts" subtitle="Inline trend" viewport="400x120"
 */
export interface SparklineProps {
	/** Values in order; null leaves a gap */
	data: (number | null)[];
	width?: number;
	height?: number;
	/** Faint fill under the line */
	area?: boolean;
	/** Dot on the last point (default true) */
	dot?: boolean;
	/** 'accent' (default, molten) or 'ink' for a quieter, secondary trend */
	tone?: "accent" | "ink";
	formatValue?: (value: number) => string;
	/** What the numbers are, e.g. "Signups, last 30 days" — prefixed to the spoken summary */
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

// A word-sized trend for KPIs and table cells. Molten by default, last point dotted; read out as
// one sentence (first, low, high, last) since there is nothing to explore at this size.
export function Sparkline({
	data = [],
	width = 96,
	height = 24,
	area = false,
	dot = true,
	tone = "accent",
	formatValue = formatNumber,
	"aria-label": ariaLabel,
	className,
	style,
}: SparklineProps) {
	const vals = data.filter((v) => v != null && !Number.isNaN(v)) as number[];
	const lo = vals.length ? Math.min(...vals) : 0;
	const hi = vals.length ? Math.max(...vals) : 1;
	const pad = 3;
	const x = linear([0, Math.max(1, data.length - 1)], [pad, width - pad]);
	const y = linear([lo, hi === lo ? lo + 1 : hi], [height - pad, pad]);
	const pts: [number, number | null][] = data.map((v, i) => [x(i), v == null ? null : y(v)]);
	const lastI = data.length - 1 - [...data].reverse().findIndex((v) => v != null);
	const summary = vals.length
		? `${ariaLabel ? `${ariaLabel}: ` : ""}from ${formatValue(vals[0]!)} to ${formatValue(vals[vals.length - 1]!)}, low ${formatValue(lo)}, high ${formatValue(hi)}`
		: (ariaLabel ?? "No data");
	const cls = ["q-sparkline", `q-sparkline--${tone === "ink" ? "ink" : "accent"}`, className]
		.filter(Boolean)
		.join(" ");
	return (
		<svg
			className={cls}
			style={style}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label={summary}
		>
			{area && <path className="q-sparkline__area" d={areaPath(pts, height - pad)} />}
			<path className="q-sparkline__line" d={linePath(pts)} />
			{dot && lastI >= 0 && lastI < data.length && (
				<circle className="q-sparkline__dot" cx={pts[lastI]![0]} cy={pts[lastI]![1]!} r={2.5} />
			)}
		</svg>
	);
}
