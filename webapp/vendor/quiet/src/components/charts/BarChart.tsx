import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import { ChartLegend, ChartTable, ChartTooltip } from "./ChartParts";
import { formatNumber, linear, seriesColor, useWidth, valueDomain } from "./chart-utils";
import "./chart.scss";
import "./BarChart.scss";

/**
 * Bars by category, grouped or stacked, vertical or horizontal. Series 1 is molten, then ink and
 * greys; 2px surface gaps between fills; rounded data ends. Each bar is a focusable mark (one tab
 * stop, arrows move) with a tooltip.
 * @startingPoint section="Charts" subtitle="Compare categories" viewport="800x320"
 */
export interface BarChartSeries {
	id?: string | number;
	name: string;
	/** One value per category */
	data: number[];
	color?: string;
}
export interface BarChartProps {
	categories: string[];
	series: BarChartSeries[];
	orientation?: "vertical" | "horizontal";
	/** Stack series within a category instead of grouping them side by side */
	stacked?: boolean;
	/** Print values at the bar ends (totals when stacked) */
	valueLabels?: boolean;
	/** Height in px (default 240 vertical; horizontal sizes to its rows) */
	height?: number;
	formatValue?: (value: number) => string;
	yTicks?: number;
	/** Show the legend (default: two or more series) */
	legend?: boolean;
	title?: React.ReactNode;
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

interface Bar {
	c: number;
	i: number;
	d: string;
	tip: [number, number];
	hit: { x: number; y: number; width: number; height: number };
	cat: string;
	s: BarChartSeries;
	val: number;
	label: string;
}

const GAP = 2; // surface gap between adjacent fills
const R = 4; // rounded data end, anchored square to the baseline

// Rect with only its data end rounded: dir = 'up' | 'down' | 'right' | 'left'.
function barPath(
	x: number,
	y: number,
	w: number,
	h: number,
	dir: "up" | "down" | "right" | "left",
	round: boolean,
) {
	const r = round ? Math.max(0, Math.min(R, w / 2, h / 2)) : 0;
	if (dir === "up")
		return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
	if (dir === "down")
		return `M${x} ${y}V${y + h - r}Q${x} ${y + h} ${x + r} ${y + h}H${x + w - r}Q${x + w} ${y + h} ${x + w} ${y + h - r}V${y}Z`;
	if (dir === "right")
		return `M${x} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x}Z`;
	return `M${x + w} ${y}H${x + r}Q${x} ${y} ${x} ${y + r}V${y + h - r}Q${x} ${y + h} ${x + r} ${y + h}H${x + w}Z`;
}

// Bars by category, grouped or stacked, vertical or horizontal. Series 1 is molten, then ink and
// greys. Every bar is a focusable mark (one tab stop, arrows move between bars) with a tooltip.
export function BarChart({
	categories = [],
	series = [],
	orientation = "vertical",
	stacked = false,
	valueLabels = false,
	height,
	formatValue = formatNumber,
	yTicks = 4,
	legend,
	title,
	"aria-label": ariaLabel,
	className,
	style,
}: BarChartProps) {
	const [ref, width] = useWidth();
	const [active, setActive] = React.useState<[number, number] | null>(null); // [category, series]
	const [focusKey, setFocusKey] = React.useState("0-0");
	const horizontal = orientation === "horizontal";
	const name = ariaLabel ?? title ?? "Bar chart";
	const nC = categories.length;
	const H =
		height ??
		(horizontal
			? Math.max(120, nC * (stacked ? 32 : 18 * Math.max(1, series.length) + 14) + 30)
			: 240);
	const pad = horizontal
		? { top: 6, right: valueLabels ? 44 : 12, bottom: 22, left: 84 }
		: { top: valueLabels ? 18 : 8, right: 8, bottom: 22, left: 40 };
	const totals = categories.map((_, c) =>
		series.reduce((a, s) => a + Math.max(0, s.data[c] ?? 0), 0),
	);
	const values = stacked ? totals : series.flatMap((s) => s.data);
	const { ticks, domain } = valueDomain(values, { zero: true, count: yTicks });
	const plotW = Math.max(40, width - pad.left - pad.right);
	const plotH = Math.max(40, H - pad.top - pad.bottom);
	const bandLen = horizontal ? plotH : plotW;
	const band = nC ? bandLen / nC : bandLen;
	const inner = band * (horizontal ? 0.72 : 0.64);
	const v = horizontal
		? linear(domain, [pad.left, pad.left + plotW])
		: linear(domain, [pad.top + plotH, pad.top]);
	const zero = v(0);
	const color = (s: BarChartSeries, i: number) => s.color ?? seriesColor(i);
	const showLegend = legend ?? series.length > 1;

	const bars: Bar[] = [];
	categories.forEach((cat, c) => {
		const b0 = (horizontal ? pad.top : pad.left) + c * band + (band - inner) / 2;
		let acc = 0;
		const lastPos = stacked
			? series.reduce((last, s, i) => ((s.data[c] ?? 0) > 0 ? i : last), -1)
			: -1;
		series.forEach((s, i) => {
			const val = s.data[c] ?? 0;
			const thick = stacked
				? inner
				: (inner - GAP * (series.length - 1)) / Math.max(1, series.length);
			const off = stacked ? 0 : i * (thick + GAP);
			const from = stacked ? v(acc) : zero;
			const to = stacked ? v(acc + Math.max(0, val)) : v(val);
			if (stacked) acc += Math.max(0, val);
			const neg = val < 0;
			const round = !stacked || i === lastPos;
			let d: string;
			let tip: [number, number];
			if (horizontal) {
				const x0 = Math.min(from, to) + (stacked && i > 0 ? GAP / 2 : 0);
				const w = Math.max(
					0,
					Math.abs(to - from) -
						(stacked && i > 0 ? GAP / 2 : 0) -
						(stacked && i < lastPos ? GAP / 2 : 0),
				);
				d = barPath(x0, b0 + off, w, thick, neg ? "left" : "right", round);
				tip = [x0 + w, b0 + off];
			} else {
				const y0 = Math.min(from, to) + (stacked && i < lastPos ? GAP / 2 : 0);
				const h = Math.max(
					0,
					Math.abs(to - from) -
						(stacked && i > 0 ? GAP / 2 : 0) -
						(stacked && i < lastPos ? GAP / 2 : 0),
				);
				d = barPath(b0 + off, y0, thick, h, neg ? "down" : "up", round);
				tip = [b0 + off + thick / 2, y0];
			}
			const hit = horizontal
				? { x: pad.left, y: b0 + off, width: plotW, height: thick }
				: { x: b0 + off, y: pad.top, width: thick, height: plotH };
			bars.push({
				c,
				i,
				d,
				tip,
				hit,
				cat,
				s,
				val,
				label: `${cat}, ${s.name}: ${formatValue(val)}`,
			});
		});
	});

	const act = active && bars.find((b) => b.c === active[0] && b.i === active[1]);
	const keyOf = (b: Bar) => `${b.c}-${b.i}`;

	return (
		<figure
			className={["q-chart", "q-bar-chart", className].filter(Boolean).join(" ")}
			style={style}
		>
			{title && <figcaption className="q-bar-chart__title">{title}</figcaption>}
			{showLegend && (
				<ChartLegend
					items={series.map((s, i) => ({ id: s.id, name: s.name, color: color(s, i) }))}
				/>
			)}
			<div ref={ref} className="q-chart__plot">
				<svg
					className="q-chart__svg"
					width={width}
					height={H}
					role="group"
					aria-label={name as string}
					onKeyDown={rovingKeyDown(".q-bar-chart__bar", "both")}
					onPointerLeave={() => setActive(null)}
				>
					{ticks.map((t) =>
						horizontal ? (
							<g key={t} aria-hidden="true">
								<line
									className={t === 0 ? "q-chart__baseline" : "q-chart__grid"}
									x1={v(t)}
									x2={v(t)}
									y1={pad.top}
									y2={pad.top + plotH}
								/>
								<text
									className="q-chart__axis-label q-chart__axis-label--middle"
									x={v(t)}
									y={H - 6}
								>
									{formatValue(t)}
								</text>
							</g>
						) : (
							<g key={t} aria-hidden="true">
								<line
									className={t === 0 ? "q-chart__baseline" : "q-chart__grid"}
									x1={pad.left}
									x2={pad.left + plotW}
									y1={v(t)}
									y2={v(t)}
								/>
								<text
									className="q-chart__axis-label q-chart__axis-label--end"
									x={pad.left - 8}
									y={v(t)}
									dy="0.32em"
								>
									{formatValue(t)}
								</text>
							</g>
						),
					)}
					{categories.map((cat, c) =>
						horizontal ? (
							<text
								key={c}
								aria-hidden="true"
								className="q-chart__axis-label q-chart__axis-label--end"
								x={pad.left - 8}
								y={pad.top + c * band + band / 2}
								dy="0.32em"
							>
								{cat}
							</text>
						) : (
							<text
								key={c}
								aria-hidden="true"
								className="q-chart__axis-label q-chart__axis-label--middle"
								x={pad.left + c * band + band / 2}
								y={H - 6}
							>
								{cat}
							</text>
						),
					)}
					{bars.map((b) => (
						<g
							key={keyOf(b)}
							className="q-bar-chart__bar"
							role="img"
							aria-label={b.label}
							tabIndex={focusKey === keyOf(b) ? 0 : -1}
							data-active={act === b || undefined}
							onFocus={() => {
								setFocusKey(keyOf(b));
								setActive([b.c, b.i]);
							}}
							onBlur={() => setActive(null)}
							onPointerEnter={() => setActive([b.c, b.i])}
						>
							<rect className="q-bar-chart__hit" {...b.hit} />
							<path
								className="q-bar-chart__fill q-chart__fade"
								style={{ "--_color": color(b.s, b.i) } as React.CSSProperties}
								d={b.d}
							/>
						</g>
					))}
					{valueLabels &&
						(stacked
							? categories.map((_, c) => (
									<text
										key={c}
										aria-hidden="true"
										className={`q-bar-chart__value${horizontal ? "" : " q-chart__axis-label--middle"}`}
										x={horizontal ? v(totals[c]!) + 6 : pad.left + c * band + band / 2}
										y={horizontal ? pad.top + c * band + band / 2 : v(totals[c]!) - 6}
										dy={horizontal ? "0.32em" : undefined}
									>
										{formatValue(totals[c]!)}
									</text>
								))
							: bars.map((b) => (
									<text
										key={`v${keyOf(b)}`}
										aria-hidden="true"
										className={`q-bar-chart__value${horizontal ? "" : " q-chart__axis-label--middle"}`}
										x={horizontal ? b.tip[0] + 6 : b.tip[0]}
										y={horizontal ? b.tip[1] + b.hit.height / 2 : b.tip[1] - 6}
										dy={horizontal ? "0.32em" : undefined}
									>
										{formatValue(b.val)}
									</text>
								)))}
				</svg>
				{act && (
					<ChartTooltip
						x={act.tip[0]}
						y={act.tip[1]}
						bounds={{ width }}
						title={act.cat}
						rows={[{ name: act.s.name, value: formatValue(act.val), color: color(act.s, act.i) }]}
					/>
				)}
			</div>
			<ChartTable
				caption={name}
				columns={["Category", ...series.map((s) => s.name)]}
				rows={categories.map((cat, c) => [cat, ...series.map((s) => formatValue(s.data[c]!))])}
			/>
		</figure>
	);
}
