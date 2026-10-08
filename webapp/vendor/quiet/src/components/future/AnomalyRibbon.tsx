import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import "./AnomalyRibbon.scss";

/**
 * A thin ribbon along a series (or above a table) marking where something unexpected happened.
 * Each mark is a button (arrow keys move between them, one tab stop); selecting one announces what
 * it is and lifts its neighbourhood in the series. Evolved from manual scanning.
 * @startingPoint section="Future" subtitle="Anomaly ribbon" viewport="700x220"
 */
export interface Anomaly {
	/** Position in the series (0-based) */
	at: number;
	/** Short name, e.g. a date: "Sep 18" */
	label: string;
	/** What's unexpected, e.g. "+38 vs expected" */
	detail?: string;
}
export interface AnomalyRibbonProps {
	anomalies: Anomaly[];
	/** Series length when there's no `data` (e.g. a ribbon above a table of N rows) */
	count?: number;
	/** Draws the series under the ribbon as bars */
	data?: number[];
	/** Selected anomaly position (controlled); null for none */
	selected?: number | null;
	defaultSelected?: number | null;
	/** Called with the anomaly's `at`, or null when it's deselected — use it to jump there */
	onSelect?: (at: number | null) => void;
	/** Accessible name of the group of marks */
	label?: string;
	/** Replaces "N anomalies in <count>" */
	summary?: React.ReactNode;
	/** Your own series or table, rendered under the ribbon */
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

// Bars this close to the selected anomaly are lifted, so the eye lands on its neighbourhood.
const NEAR = 5;

// A thin ribbon along a series that marks where something unexpected happened. You don't scan for
// the needle: each mark is a button, and selecting one says what it is (and lets you jump to it).
export function AnomalyRibbon({
	anomalies = [],
	count,
	data,
	selected,
	defaultSelected = null,
	onSelect,
	label = "Anomalies",
	summary,
	children,
	className,
	style,
}: AnomalyRibbonProps) {
	const n = count ?? (data ? data.length : 0);
	const [inner, setInner] = React.useState<number | null>(defaultSelected);
	const [focusAt, setFocusAt] = React.useState<number | null>(null);
	const cur = selected !== undefined ? selected : inner;
	const pick = (at: number) => {
		const next = at === cur ? null : at;
		setInner(next);
		onSelect?.(next);
	};
	const active = anomalies.find((a) => a.at === cur);
	// Marks sit over the centre of their bar.
	const pos = (at: number) => (n > 0 ? (at + 0.5) / n : 0);
	const max = data ? Math.max(...data) : 1;
	const min = data ? Math.min(0, ...data) : 0;
	// Roving tabindex: the last focused mark, else the selected one, else the first, is the one tab stop.
	const stop = anomalies.some((a) => a.at === focusAt)
		? focusAt
		: active
			? active.at
			: anomalies[0]?.at;
	const cls = ["q-anomaly-ribbon", className].filter(Boolean).join(" ");
	return (
		<div className={cls} style={style}>
			<div
				role="group"
				aria-label={label}
				onKeyDown={rovingKeyDown(".q-anomaly-ribbon__mark", "horizontal")}
				className="q-anomaly-ribbon__ribbon"
			>
				{anomalies.map((a) => (
					<button
						key={a.at}
						type="button"
						tabIndex={a.at === stop ? 0 : -1}
						aria-pressed={a.at === cur}
						aria-label={a.label + (a.detail ? `: ${a.detail}` : "")}
						onClick={() => pick(a.at)}
						onFocus={() => setFocusAt(a.at)}
						className="q-anomaly-ribbon__mark"
						style={{ "--_x": pos(a.at) } as React.CSSProperties}
					/>
				))}
			</div>
			<div className="q-anomaly-ribbon__caption">
				<span className="q-anomaly-ribbon__summary">
					{summary ??
						`${anomalies.length + (anomalies.length === 1 ? " anomaly" : " anomalies")} in ${n}`}
				</span>
				<span role="status" className="q-anomaly-ribbon__detail">
					{active ? active.label + (active.detail ? ` · ${active.detail}` : "") : ""}
				</span>
			</div>
			{data && (
				<div aria-hidden="true" className="q-anomaly-ribbon__series">
					{data.map((v, i) => {
						const isAnomaly = anomalies.some((a) => a.at === i);
						const state =
							i === cur
								? "selected"
								: isAnomaly
									? "anomaly"
									: cur != null && Math.abs(cur - i) <= NEAR
										? "near"
										: undefined;
						return (
							<span
								key={i}
								data-mark={state}
								className="q-anomaly-ribbon__bar"
								style={{ "--_h": max === min ? 0 : (v - min) / (max - min) } as React.CSSProperties}
							/>
						);
					})}
				</div>
			)}
			{children}
		</div>
	);
}
