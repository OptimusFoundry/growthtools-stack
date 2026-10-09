import type React from "react";
import { seriesColor, seriesDash } from "./chart-utils";
import "./chart.scss";

/** One legend entry: a name and the series colour it stands for. */
export interface ChartLegendItem {
	id?: string | number;
	name: React.ReactNode;
	/** CSS colour; defaults to the series palette by position */
	color?: string;
}
export interface ChartLegendProps {
	items: ChartLegendItem[];
	/** 'line' shows short strokes (dashed for series 4–5); 'dot' shows dots */
	kind?: "dot" | "line";
	className?: string;
	style?: React.CSSProperties;
}
export interface ChartTooltipRow {
	id?: string | number;
	name: React.ReactNode;
	value: React.ReactNode;
	color?: string;
}
export interface ChartTooltipProps {
	/** Anchor in px inside the plot */
	x: number;
	y: number;
	bounds: { width: number };
	title?: React.ReactNode;
	rows: ChartTooltipRow[];
}
export interface ChartTableProps {
	caption: React.ReactNode;
	columns: React.ReactNode[];
	rows: React.ReactNode[][];
}

// Pieces every quiet chart shares: the legend, the hover/keyboard tooltip and the hidden data table.

/** Legend for two or more series; a line chart shows short strokes, bars and donuts show dots. */
export function ChartLegend({ items, kind = "dot", className, style }: ChartLegendProps) {
	return (
		<ul className={["q-chart__legend", className].filter(Boolean).join(" ")} style={style}>
			{items.map((it, i) => (
				<li key={it.id ?? i} className="q-chart__legend-item">
					<span
						aria-hidden="true"
						className={`q-chart__swatch${kind === "line" ? " q-chart__swatch--line" : ""}`}
						style={
							{
								"--_color": it.color ?? seriesColor(i),
								"--_style":
									seriesDash(i) === "none"
										? "solid"
										: seriesDash(i) === "1 3"
											? "dotted"
											: "dashed",
							} as React.CSSProperties
						}
					/>
					{it.name}
				</li>
			))}
		</ul>
	);
}

/** Floating readout at (x, y) px inside the plot; flips left/up so it stays inside `bounds`. */
export function ChartTooltip({ x, y, bounds, title, rows }: ChartTooltipProps) {
	const flipX = x > bounds.width * 0.6;
	const tx = flipX ? `calc(${x}px - 100% - 12px)` : `${x + 12}px`;
	const ty = `max(0px, calc(${y}px - 50%))`;
	return (
		<div
			aria-hidden="true"
			className="q-chart__tooltip"
			style={{ "--_tx": tx, "--_ty": ty } as React.CSSProperties}
		>
			{title != null && <span className="q-chart__tooltip-title">{title}</span>}
			{rows.map((r, i) => (
				<span key={r.id ?? i} className="q-chart__tooltip-row">
					{r.color && (
						<span
							className="q-chart__swatch"
							style={{ "--_color": r.color } as React.CSSProperties}
						/>
					)}
					<span>{r.name}</span>
					<span className="q-chart__tooltip-value">{r.value}</span>
				</span>
			))}
		</div>
	);
}

/** The chart's data as a visually hidden table, for screen readers and copy-out. */
export function ChartTable({ caption, columns, rows }: ChartTableProps) {
	return (
		// The wrapper is what hides it: a <table> ignores the 1px box of .q-sr-only and would still
		// extend the page by its full height.
		<div className="q-sr-only">
			<table>
				<caption>{caption}</caption>
				<thead>
					<tr>
						{columns.map((c, i) => (
							<th key={i} scope="col">
								{c}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={i}>
							{r.map((c, j) =>
								j === 0 ? (
									<th key={j} scope="row">
										{c}
									</th>
								) : (
									<td key={j}>{c}</td>
								),
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
