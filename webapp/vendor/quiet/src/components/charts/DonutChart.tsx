import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import { ChartLegend, ChartTable } from "./ChartParts";
import { arcPath, formatNumber, seriesColor } from "./chart-utils";
import "./chart.scss";
import "./DonutChart.scss";

/**
 * Share of a total. Largest segment molten, the rest ink then greys, with a centre total that
 * turns into the active segment's share on hover or focus. Segments are focusable marks.
 * @startingPoint section="Charts" subtitle="Share of a total" viewport="600x260"
 */
export interface DonutChartDatum {
	id?: string | number;
	label: string;
	value: number;
	color?: string;
}
export interface DonutChartProps {
	data: DonutChartDatum[];
	/** Diameter in px (default 200) */
	size?: number;
	/** Ring thickness in px (default 22) */
	thickness?: number;
	/** Order largest first so the largest gets molten (default true) */
	sort?: boolean;
	formatValue?: (value: number) => string;
	/** Mono caption in the centre (default "Total") */
	centerLabel?: React.ReactNode;
	/** Centre figure (default: the formatted total) */
	centerValue?: React.ReactNode;
	/** Legend with shares beside the ring (default true) */
	legend?: boolean;
	title?: React.ReactNode;
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

// Share of a total. Segments are ordered largest first, so the largest carries molten and the
// rest step through ink and greys; a 2px surface gap separates them. Each segment is a focusable
// mark (one tab stop, arrows move); the centre shows the total, or the active segment's share.
export function DonutChart({
	data = [],
	size = 200,
	thickness = 22,
	sort = true,
	formatValue = formatNumber,
	centerLabel = "Total",
	centerValue,
	legend = true,
	title,
	"aria-label": ariaLabel,
	className,
	style,
}: DonutChartProps) {
	const [active, setActive] = React.useState<number | null>(null);
	const [focusI, setFocusI] = React.useState(0);
	const name = ariaLabel ?? title ?? "Donut chart";
	const items = (sort ? [...data].sort((a, b) => b.value - a.value) : data).map((d, i) => ({
		...d,
		color: d.color ?? seriesColor(i),
	}));
	const total = items.reduce((a, d) => a + Math.max(0, d.value), 0);
	const pct = (v: number) => `${total ? Math.round((v / total) * 100) : 0}%`;
	const c = size / 2;
	let a = 0;
	const segs = items.map((d, i) => {
		const sweep = total ? (Math.max(0, d.value) / total) * Math.PI * 2 : 0;
		const seg = { ...d, i, d: sweep > 0 ? arcPath(c, c, c - thickness, c - 1, a, a + sweep) : "" };
		a += sweep;
		return seg;
	});
	const act = active != null ? segs[active] : null;
	return (
		<figure
			className={["q-chart", "q-donut-chart", className].filter(Boolean).join(" ")}
			style={style}
		>
			{title && <figcaption className="q-donut-chart__title">{title}</figcaption>}
			<div className="q-donut-chart__body">
				<div
					className="q-donut-chart__ring"
					style={{ "--_size": `${size}px` } as React.CSSProperties}
				>
					<svg
						className="q-chart__svg"
						width={size}
						height={size}
						viewBox={`0 0 ${size} ${size}`}
						role="group"
						aria-label={name as string}
						onKeyDown={rovingKeyDown(".q-donut-chart__segment", "both")}
						onPointerLeave={() => setActive(null)}
					>
						{segs.map(
							(s) =>
								s.d && (
									<path
										key={s.id ?? s.label}
										className="q-donut-chart__segment q-chart__fade"
										d={s.d}
										role="img"
										aria-label={`${s.label}: ${formatValue(s.value)}, ${pct(s.value)}`}
										tabIndex={focusI === s.i ? 0 : -1}
										data-active={active === s.i || undefined}
										style={{ "--_color": s.color } as React.CSSProperties}
										onFocus={() => {
											setFocusI(s.i);
											setActive(s.i);
										}}
										onBlur={() => setActive(null)}
										onPointerEnter={() => setActive(s.i)}
									/>
								),
						)}
					</svg>
					<div className="q-donut-chart__center" aria-hidden="true">
						<span className="q-donut-chart__center-label">{act ? act.label : centerLabel}</span>
						<span className="q-donut-chart__center-value">
							{act ? pct(act.value) : (centerValue ?? formatValue(total))}
						</span>
						{act && <span className="q-donut-chart__center-sub">{formatValue(act.value)}</span>}
					</div>
				</div>
				{legend && (
					<ChartLegend
						className="q-donut-chart__legend"
						items={items.map((d) => ({
							id: d.id ?? d.label,
							name: (
								<>
									{d.label} <span className="q-donut-chart__share">{pct(d.value)}</span>
								</>
							),
							color: d.color,
						}))}
					/>
				)}
			</div>
			<ChartTable
				caption={name}
				columns={["Segment", "Value", "Share"]}
				rows={items.map((d) => [d.label, formatValue(d.value), pct(d.value)])}
			/>
		</figure>
	);
}
