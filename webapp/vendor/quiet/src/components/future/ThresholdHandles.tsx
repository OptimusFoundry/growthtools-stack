import React from "react";
import "./ThresholdHandles.scss";

/**
 * Alert thresholds as lines dragged on the chart itself. Bars outside the band are the alerts that
 * would have fired, and the count updates as you move a line — sensitivity set with the false
 * positives in view. Each line is a vertical slider (arrows, PageUp/PageDown, Home/End).
 * Evolved from the alert rule form.
 * @startingPoint section="Future" subtitle="Threshold handles" viewport="700x260"
 */
export interface ThresholdValue {
	/** Lower line; omit for a high-only alert */
	low?: number;
	/** Upper line; omit for a low-only alert */
	high?: number;
}
export interface ThresholdHandlesProps {
	/** The history the thresholds are tested against, oldest first */
	data: number[];
	value?: ThresholdValue;
	defaultValue?: ThresholdValue;
	onChange?: (value: ThresholdValue) => void;
	min?: number;
	/** Top of the chart; default 1.2 × the largest value */
	max?: number;
	step?: number;
	label?: React.ReactNode;
	formatValue?: (value: number) => React.ReactNode;
	/** Summary line; default "Would have fired N× in <data.length>" */
	summary?: (fires: number, total: number) => React.ReactNode;
	lowLabel?: string;
	highLabel?: string;
	className?: string;
	style?: React.CSSProperties;
}

const round = (n: number) => Number(n.toFixed(6));

type Which = "low" | "high";

// Alert thresholds as lines you drag on the chart itself. Bars outside the band are the alerts that
// would have fired, so you set sensitivity with the false positives in view.
export function ThresholdHandles({
	data = [],
	value,
	defaultValue,
	onChange,
	min = 0,
	max,
	step = 0.1,
	label,
	formatValue,
	summary,
	lowLabel = "Low threshold",
	highLabel = "High threshold",
	className,
	style,
}: ThresholdHandlesProps) {
	const top = max ?? Math.ceil(Math.max(min + 1, ...data) * 1.2);
	const [inner, setInner] = React.useState<ThresholdValue>(defaultValue ?? {});
	const [glide, setGlide] = React.useState(false);
	const cur = value ?? inner;
	const { low, high } = cur;
	const uid = React.useId();
	const chart = React.useRef<HTMLDivElement>(null);
	const fmt = formatValue || ((v: number) => String(v));
	const snap = (v: number) => round(Math.round((v - min) / step) * step + min);
	// Each handle stays on its own side of the other, a step apart.
	const bounds = (which: Which): [number, number] =>
		which === "low" ? [min, round((high ?? top) - step)] : [round((low ?? min) + step), top];
	const set = (which: Which, v: number) => {
		const [lo, hi] = bounds(which);
		const n = Math.min(hi, Math.max(lo, snap(v)));
		if (n === cur[which]) return;
		const next = { ...cur, [which]: n };
		setInner(next);
		onChange?.(next);
	};
	const out = (v: number) => (high != null && v > high) || (low != null && v < low);
	const fires = data.filter(out).length;
	const pct = (v: number) => (top === min ? 0 : (v - min) / (top - min));

	const fromY = (which: Which, y: number) => {
		const r = chart.current!.getBoundingClientRect();
		set(which, min + (1 - (y - r.top) / r.height) * (top - min));
	};
	const down = (which: Which) => (e: React.PointerEvent<HTMLElement>) => {
		setGlide(false);
		e.currentTarget.setPointerCapture(e.pointerId);
		e.currentTarget.focus();
		fromY(which, e.clientY);
	};
	const move = (which: Which) => (e: React.PointerEvent<HTMLElement>) => {
		if (e.currentTarget.hasPointerCapture(e.pointerId)) fromY(which, e.clientY);
	};
	const key = (which: Which) => (e: React.KeyboardEvent<HTMLElement>) => {
		const d = (
			{
				ArrowUp: step,
				ArrowRight: step,
				ArrowDown: -step,
				ArrowLeft: -step,
				PageUp: step * 10,
				PageDown: -step * 10,
			} as Record<string, number | undefined>
		)[e.key];
		const [lo, hi] = bounds(which);
		const to = d ? cur[which]! + d : e.key === "Home" ? lo : e.key === "End" ? hi : null;
		if (to === null) return;
		e.preventDefault();
		setGlide(true);
		set(which, to);
	};

	const handles = [
		["high", high, highLabel],
		["low", low, lowLabel],
	].filter(([, v]) => v != null) as [Which, number, string][];
	const cls = ["q-threshold-handles", className].filter(Boolean).join(" ");
	return (
		<div role="group" aria-labelledby={label ? `${uid}l` : undefined} className={cls} style={style}>
			<div className="q-threshold-handles__header">
				{label && (
					<span id={`${uid}l`} className="q-threshold-handles__label">
						{label}
					</span>
				)}
				<span
					id={`${uid}s`}
					role="status"
					className="q-threshold-handles__summary"
					data-firing={fires > 0 || undefined}
				>
					{summary ? summary(fires, data.length) : `Would have fired ${fires}× in ${data.length}`}
				</span>
			</div>
			<div
				ref={chart}
				className="q-threshold-handles__chart"
				data-glide={glide || undefined}
				style={{ "--_low": pct(low ?? min), "--_high": pct(high ?? top) } as React.CSSProperties}
			>
				<span aria-hidden="true" className="q-threshold-handles__band" />
				<div aria-hidden="true" className="q-threshold-handles__bars">
					{data.map((v, i) => (
						<span
							key={i}
							data-out={out(v) || undefined}
							className="q-threshold-handles__bar"
							style={{ "--_h": pct(Math.min(top, Math.max(min, v))) } as React.CSSProperties}
						/>
					))}
				</div>
				{handles.map(([which, v, name]) => (
					<span
						key={which}
						role="slider"
						tabIndex={0}
						aria-orientation="vertical"
						aria-label={name}
						aria-valuemin={bounds(which)[0]}
						aria-valuemax={bounds(which)[1]}
						aria-valuenow={v}
						aria-valuetext={String(fmt(v))}
						aria-describedby={`${uid}s`}
						onPointerDown={down(which)}
						onPointerMove={move(which)}
						onKeyDown={key(which)}
						className={`q-threshold-handles__handle q-threshold-handles__handle--${which}`}
						style={{ "--_t": pct(v) } as React.CSSProperties}
					>
						<span className="q-threshold-handles__line" />
						<span aria-hidden="true" className="q-threshold-handles__tag">
							{which} {fmt(v)}
						</span>
					</span>
				))}
			</div>
		</div>
	);
}
