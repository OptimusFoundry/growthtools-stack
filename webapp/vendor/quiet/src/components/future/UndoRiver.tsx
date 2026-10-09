import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import "./UndoRiver.scss";

/**
 * Everything anyone (or any agent) did drifts downstream for a day, dimming as it ages; anything
 * still in the river can be pulled back. Undo becomes a place, not a keystroke. One tab stop;
 * arrows move along the river, newest first; an undo is announced.
 * @startingPoint section="Future" subtitle="Undo as a place" viewport="720x220"
 */
export interface UndoRiverItem {
	id: string | number;
	/** What was done, e.g. "Paused Founding members" */
	label: string;
	/** Who did it, e.g. "Ada Park" or "Meerkat" */
	by?: string;
	/** you = molten dot, agent = ink square, person = hollow dot */
	kind?: "you" | "person" | "agent";
	/** When it happened */
	at: number | string | Date;
}
export interface UndoRiverProps {
	items: UndoRiverItem[];
	/** Current time; without it the river re-reads the clock every 30s */
	now?: number;
	/** How long an action stays undoable, in ms (default 24h) */
	window?: number;
	onUndo?: (item: UndoRiverItem) => void;
	/** Accessible name of the list (default "Recent actions") */
	label?: string;
	startLabel?: React.ReactNode;
	endLabel?: React.ReactNode;
	/** Line under the river before anything is undone */
	hint?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const HOUR = 3600e3;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["hour", HOUR],
	["minute", 60e3],
];
const rtf =
	typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;
const ago = (ms: number) => {
	for (const [unit, size] of UNITS)
		if (ms >= size) {
			const n = Math.floor(ms / size);
			return rtf ? rtf.format(-n, unit) : `${n} ${unit}s ago`;
		}
	return "just now";
};

// Undo stops being a keystroke that works for one step. Everything anyone (or any agent) did
// drifts downstream for `window`, dimming as it goes, and anything still in the river can be
// pulled back. Newest first for the keyboard: one tab stop, arrows move along the river.
export function UndoRiver({
	items = [],
	now,
	window: span = 24 * HOUR,
	onUndo,
	label = "Recent actions",
	startLabel = "just now",
	endLabel = "24 h · gone",
	hint = "Pick anything still drifting by to undo it.",
	className,
	style,
}: UndoRiverProps) {
	const [clock, setClock] = React.useState(() => Date.now());
	React.useEffect(() => {
		if (now != null) return;
		const t = setInterval(() => setClock(Date.now()), 30e3);
		return () => clearInterval(t);
	}, [now]);
	const t = now ?? clock;
	const live = items
		.map((it) => ({ ...it, elapsed: Math.max(0, t - new Date(it.at).getTime()) }))
		.filter((it) => it.elapsed < span)
		.sort((a, b) => a.elapsed - b.elapsed);
	const [stop, setStop] = React.useState<UndoRiverItem["id"] | null>(null);
	const [undone, setUndone] = React.useState<string | null>(null);
	const stopId = live.some((it) => it.id === stop) ? stop : live[0]?.id;
	const list = React.useRef<HTMLUListElement>(null);
	const next = React.useRef<string | null>(null);
	// When the caller removes the undone action, keep focus in the river on its neighbour.
	React.useEffect(() => {
		if (next.current == null || !list.current) return;
		const el = list.current.querySelector<HTMLElement>(`[data-id="${next.current}"]`);
		if (el && !list.current.contains(document.activeElement)) el.focus();
		next.current = null;
	});
	const undo = (it: (typeof live)[number], i: number) => {
		const near = live[i + 1] || live[i - 1];
		next.current = near ? String(near.id) : null;
		setUndone(it.label);
		onUndo?.(it);
	};
	return (
		<div className={["q-undo-river", className].filter(Boolean).join(" ")} style={style}>
			<div className="q-undo-river__band">
				<ul
					ref={list}
					aria-label={label}
					onKeyDown={rovingKeyDown(".q-undo-river__item", "both")}
					className="q-undo-river__items"
				>
					{live.map((it, i) => {
						const age = it.elapsed / span;
						return (
							<li
								key={it.id}
								className="q-undo-river__lane"
								style={{ "--_age": age, "--_lane": i % 3 } as React.CSSProperties}
								data-age={age < 1 / 3 ? "fresh" : age < 2 / 3 ? "drifting" : "fading"}
							>
								<button
									type="button"
									tabIndex={it.id === stopId ? 0 : -1}
									data-id={it.id}
									onFocus={() => setStop(it.id)}
									onClick={() => undo(it, i)}
									className="q-undo-river__item"
									aria-label={`${[
										it.label,
										it.kind === "you" ? "by you" : it.by && `by ${it.by}`,
										ago(it.elapsed),
									]
										.filter(Boolean)
										.join(", ")}. Undo`}
								>
									<span
										aria-hidden="true"
										className={`q-undo-river__who q-undo-river__who--${it.kind || "person"}`}
									/>
									{it.label}
									<span aria-hidden="true" className="q-undo-river__undo">
										↺
									</span>
								</button>
							</li>
						);
					})}
				</ul>
				<span aria-hidden="true" className="q-undo-river__edge q-undo-river__edge--start">
					{startLabel}
				</span>
				<span aria-hidden="true" className="q-undo-river__edge q-undo-river__edge--end">
					{endLabel}
				</span>
			</div>
			<p role="status" className="q-undo-river__status" data-undone={undone ? "" : undefined}>
				{undone ? `Undid: ${undone}` : hint}
			</p>
		</div>
	);
}
