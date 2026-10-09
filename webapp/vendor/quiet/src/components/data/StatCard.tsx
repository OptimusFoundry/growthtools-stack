import React from "react";
import { useLinkElement } from "../../lib/link";
import "./StatCard.scss";

/**
 * Dashboard metric. Mono label, 40px 700 value, mono delta with ↗ / ↘ glyph.
 * @startingPoint section="Data" subtitle="Dashboard metrics" viewport="800x240"
 */
export interface StatCardProps {
	label: React.ReactNode;
	value: number | string;
	/** Formats the (animated) value */
	format?: (value: number | string) => React.ReactNode;
	/** Number = percent; string shown as-is */
	delta?: number | string;
	/** Inferred from delta sign when omitted */
	trend?: "up" | "down" | "neutral";
	/** e.g. "vs last month" */
	period?: React.ReactNode;
	previousValue?: number | string;
	icon?: React.ReactNode;
	variant?: "outlined" | "filled" | "plain";
	/** Count up from 0 (ease-in-out, 1.2s). Later numeric value changes always ease from the old value (0.6s). */
	animate?: boolean;
	onClick?: () => void;
	href?: string;
	className?: string;
	style?: React.CSSProperties;
}

const VARIANTS: string[] = ["outlined", "filled", "plain"];

// Counts up from 0 on mount when `on`; later numeric changes ease from the previous value (600ms).
function useCount(target: number | string, on: boolean, dur = 1200) {
	const [v, setV] = React.useState(on ? 0 : target);
	const shown = React.useRef(v);
	React.useEffect(() => {
		const from = shown.current;
		const set = (x: number | string) => {
			shown.current = x;
			setV(x);
		};
		if (typeof target !== "number" || typeof from !== "number" || from === target) {
			set(target);
			return;
		}
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
			set(target);
			return;
		}
		const ms = on && from === 0 ? dur : 600;
		let raf: number;
		const t0 = performance.now();
		const step = (t: number) => {
			const p = Math.min(1, (t - t0) / ms);
			const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
			set(from + (target - from) * e);
			if (p < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [target, on, dur]);
	return v;
}

export function StatCard({
	label,
	value,
	format,
	delta,
	trend,
	period,
	previousValue,
	icon,
	variant = "outlined",
	animate = false,
	onClick,
	href,
	className,
	style,
}: StatCardProps) {
	const shown = useCount(value, animate && typeof value === "number");
	const fmt =
		format || ((v) => (typeof v === "number" ? Math.round(v).toLocaleString("en-US") : v));
	const tr =
		trend ||
		(typeof delta === "number"
			? delta > 0
				? "up"
				: delta < 0
					? "down"
					: "neutral"
			: typeof delta === "string"
				? delta.trim().startsWith("-") || delta.trim().startsWith("\u2212")
					? "down"
					: "up"
				: "neutral");
	const glyph = { up: "\u2197", down: "\u2198", neutral: "\u2192" }[tr];
	const deltaText =
		typeof delta === "number"
			? `${(delta > 0 ? "+" : delta < 0 ? "\u2212" : "") + Math.abs(delta)}%`
			: delta;
	const interactive = !!(onClick || href);
	const A = useLinkElement(href);
	const El: React.ElementType = href ? A : onClick ? "button" : "div";
	const cls = [
		"q-stat-card",
		VARIANTS.includes(variant) && `q-stat-card--${variant}`,
		interactive && "q-stat-card--interactive",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<El href={href} onClick={onClick} className={cls} style={style}>
			<div className="q-stat-card__head">
				<span className="q-stat-card__label">{label}</span>
				{icon && (
					<span aria-hidden="true" className="q-stat-card__icon">
						{icon}
					</span>
				)}
			</div>
			<div className="q-stat-card__value">
				<span aria-hidden="true">{fmt(shown)}</span>
				<span className="q-sr-only">{fmt(value)}</span>
			</div>
			{(delta != null || period || previousValue != null) && (
				<div className="q-stat-card__meta">
					{delta != null && (
						<span className="q-stat-card__delta">
							<span
								aria-hidden="true"
								className={`q-stat-card__glyph${tr === "down" ? " q-stat-card__glyph--down" : ""}`}
							>
								{glyph}
							</span>
							<span className="q-sr-only">
								{{ up: "Up", down: "Down", neutral: "Unchanged" }[tr]}{" "}
							</span>
							{deltaText}
						</span>
					)}
					{period && <span className="q-stat-card__period">{period}</span>}
					{previousValue != null && <span>Prev {fmt(previousValue)}</span>}
				</div>
			)}
		</El>
	);
}
