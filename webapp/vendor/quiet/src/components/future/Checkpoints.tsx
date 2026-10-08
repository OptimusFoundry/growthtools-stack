import React from "react";
import { Button } from "../core/Button";
import "./Checkpoints.scss";

/**
 * A timeline of snapshots you can scrub when people and agents both edit. Agent snapshots are
 * square, human ones round. Arrow keys move between snapshots; Enter restores the selected one.
 * @startingPoint section="Future" subtitle="Scrubbable shared history" viewport="760x240"
 */
export interface Checkpoint {
	id?: string;
	/** What changed, e.g. "Paused 3 campaigns" */
	label: string;
	/** Who made it */
	who?: string;
	/** When, e.g. "14:02" */
	time?: string;
	/** Made by an agent (square mark) rather than a person (round) */
	agent?: boolean;
	/** How many changes this snapshot made (default 1); restoring before it reverts them */
	changes?: number;
}
export interface CheckpointsProps {
	/** Oldest first; the last one is the current state */
	checkpoints?: Checkpoint[];
	/** Selected index (controlled) */
	value?: number;
	/** Initially selected index (default: the current state) */
	defaultValue?: number;
	onChange?: (index: number) => void;
	/** Restore the selected snapshot; without it the Restore button is disabled */
	onRestore?: (checkpoint: Checkpoint, index: number) => void;
	/** Accessible name for the timeline (default "Checkpoints") */
	label?: string;
	restoreLabel?: string;
	currentLabel?: string;
	/** Noun used in "reverts 3 later changes" */
	changeWord?: string;
	className?: string;
	style?: React.CSSProperties;
}

const plural = (n: number, w: string) => `${n} later ${w}${n === 1 ? "" : "s"}`;

// When people and agents both edit, state needs a timeline you can scrub, not a hidden undo stack.
// Agent snapshots are square, human ones round. Arrow keys move between snapshots; Enter (or the
// Restore button) restores the selected one.
export function Checkpoints({
	checkpoints = [],
	value,
	defaultValue,
	onChange,
	onRestore,
	label = "Checkpoints",
	restoreLabel = "Restore",
	currentLabel = "Now",
	changeWord = "change",
	className,
	style,
}: CheckpointsProps) {
	const last = checkpoints.length - 1;
	const [inner, setInner] = React.useState(defaultValue ?? last);
	const sel = Math.min(last, Math.max(0, value ?? inner));
	const uid = React.useId();
	const list = React.useRef<HTMLDivElement>(null);
	const select = (i: number, focus?: boolean) => {
		const to = Math.min(last, Math.max(0, i));
		setInner(to);
		onChange?.(to);
		if (focus) list.current?.children[to] && (list.current.children[to] as HTMLElement).focus();
	};
	const reverts = checkpoints.slice(sel + 1).reduce((n, c) => n + (c.changes ?? 1), 0);
	const restore = () => {
		if (sel < last && onRestore) onRestore(checkpoints[sel]!, sel);
	};
	const key = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const to = (
			{
				ArrowRight: sel + 1,
				ArrowDown: sel + 1,
				ArrowLeft: sel - 1,
				ArrowUp: sel - 1,
				Home: 0,
				End: last,
			} as Record<string, number>
		)[e.key];
		if (to != null) {
			e.preventDefault();
			select(to, true);
		} else if (e.key === "Enter" && sel < last) {
			e.preventDefault();
			restore();
		}
	};
	const c = checkpoints[sel];
	const cls = ["q-checkpoints", className].filter(Boolean).join(" ");
	return (
		<div
			className={cls}
			style={
				{
					"--_n": Math.max(1, checkpoints.length),
					"--_progress": last > 0 ? sel / last : 1,
					...style,
				} as React.CSSProperties
			}
		>
			<div className="q-checkpoints__track">
				<span aria-hidden="true" className="q-checkpoints__rail" />
				<span aria-hidden="true" className="q-checkpoints__fill" />
				<div
					ref={list}
					role="listbox"
					aria-orientation="horizontal"
					aria-label={label}
					aria-describedby={`${uid}d`}
					className="q-checkpoints__list"
					onKeyDown={key}
				>
					{checkpoints.map((p, i) => (
						<div
							key={p.id ?? i}
							role="option"
							tabIndex={i === sel ? 0 : -1}
							aria-selected={i === sel}
							aria-label={[p.label, p.who, p.time, i === last ? currentLabel : null]
								.filter(Boolean)
								.join(", ")}
							className={`q-checkpoints__point q-checkpoints__point--${p.agent ? "agent" : "person"}`}
							data-past={i < sel || undefined}
							onClick={() => select(i)}
						>
							<span aria-hidden="true" className="q-checkpoints__mark" />
							<span aria-hidden="true" className="q-checkpoints__time">
								{p.time}
							</span>
						</div>
					))}
				</div>
			</div>
			{c && (
				<div className="q-checkpoints__detail">
					<div className="q-checkpoints__summary">
						<span className="q-checkpoints__label">{c.label}</span>
						<span id={`${uid}d`} className="q-checkpoints__meta" aria-live="polite">
							{[c.who, c.time].filter(Boolean).join(" · ")}
							{sel < last
								? ` · restoring here reverts ${plural(reverts, changeWord)}`
								: " · current state"}
						</span>
					</div>
					{sel < last ? (
						<Button size="sm" variant="secondary" onClick={restore} disabled={!onRestore}>
							{restoreLabel}
						</Button>
					) : (
						<span className="q-checkpoints__now">
							<span aria-hidden="true" className="q-checkpoints__now-dot" />
							{currentLabel}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
