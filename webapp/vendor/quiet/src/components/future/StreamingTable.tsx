import React from "react";
import { motionToken } from "../../a11y/hooks";
import type { TableProps } from "../data/Table";
import { Table } from "../data/Table";
import "./StreamingTable.scss";

/**
 * A live Table (newest rows first) that never moves under your hand. While it's paused, scrolled
 * down or has focus inside, new rows wait behind a "Show N new" bar and come in all at once;
 * otherwise they arrive at the top and glow once. Arrivals are announced politely, batched.
 * Evolved from auto-refresh.
 * @startingPoint section="Future" subtitle="Streaming table" viewport="800x360"
 */
export interface StreamingTableProps<
	Row = Record<string, unknown>,
	Key extends React.Key = React.Key,
> {
	/** The latest rows, newest first. Pass a new array as rows arrive. */
	rows: Row[];
	columns: TableProps<Row, Key>["columns"];
	/** Field name or getter; default 'id' */
	rowKey?: string | ((row: Row) => Key);
	paused?: boolean;
	defaultPaused?: boolean;
	onPausedChange?: (paused: boolean) => void;
	/** Show at most this many rows */
	maxRows?: number;
	/** Scroll inside the table above this height (scrolling down holds new rows) */
	maxHeight?: number | string;
	caption?: React.ReactNode;
	/** Accessible name when there is no caption */
	label?: string;
	size?: "sm" | "md" | "lg";
	liveLabel?: React.ReactNode;
	pausedLabel?: React.ReactNode;
	pauseLabel?: React.ReactNode;
	resumeLabel?: React.ReactNode;
	/** Text of the bar that lets waiting rows in; default "Show N new" */
	newLabel?: (count: number) => React.ReactNode;
	/** Announcements are batched to at most one per this many ms (default 2000) */
	announceEvery?: number;
	className?: string;
	style?: React.CSSProperties;
}

// A live table that never moves under your hand. New rows (newest first) arrive at the top, unless
// you've paused, scrolled down or put focus inside the table — then they wait behind a
// "N new" bar and come in all at once when you ask. Arrivals are announced politely, in batches.
export function StreamingTable<Row = Record<string, unknown>, Key extends React.Key = React.Key>({
	rows = [],
	columns = [],
	rowKey = "id",
	paused,
	defaultPaused = false,
	onPausedChange,
	maxRows,
	maxHeight,
	caption,
	label,
	size,
	liveLabel = "Live",
	pausedLabel = "Paused",
	pauseLabel = "Pause",
	resumeLabel = "Resume",
	newLabel = (n) => `Show ${n} new`,
	announceEvery = 2000,
	className,
	style,
}: StreamingTableProps<Row, Key>) {
	const keyOf = React.useCallback(
		(r: Row, i?: number) =>
			typeof rowKey === "function" ? rowKey(r) : ((r as Record<string, unknown>)[rowKey] ?? i),
		[rowKey],
	);
	const [innerPaused, setInnerPaused] = React.useState(defaultPaused);
	const isPaused = paused ?? innerPaused;
	const [shown, setShown] = React.useState(rows);
	const [focused, setFocused] = React.useState(false);
	const [scrolled, setScrolled] = React.useState(false);
	const [said, setSaid] = React.useState("");
	const holding = isPaused || focused || scrolled;
	const scroller = React.useRef<HTMLDivElement>(null);
	const fresh = React.useRef(0); // rows let in by the last update, highlighted once
	const queue = React.useRef<{
		shown: number;
		held: number;
		timer: ReturnType<typeof setTimeout> | null;
	}>({ shown: 0, held: 0, timer: null });

	const shownKeys = new Set(shown.map(keyOf));
	const waiting = rows.filter((r, i) => !shownKeys.has(keyOf(r, i))).length;

	// Batch announcements: at most one every `announceEvery` ms, so a busy stream isn't a busy screen reader.
	const announce = React.useCallback(
		(kind: "shown" | "held", n: number) => {
			const q = queue.current;
			q[kind] += n;
			if (q.timer) return;
			const flush = () => {
				const parts: string[] = [];
				if (q.shown) parts.push(q.shown + (q.shown === 1 ? " new row" : " new rows"));
				if (q.held) parts.push(`${q.held} waiting`);
				setSaid(parts.join(", "));
				q.shown = 0;
				q.held = 0;
				q.timer = null;
			};
			q.timer = setTimeout(flush, announceEvery);
		},
		[announceEvery],
	);
	React.useEffect(() => () => clearTimeout(queue.current.timer!), []);

	const letIn = React.useCallback(
		(next: Row[]) => {
			setShown((prev) => {
				const had = new Set(prev.map(keyOf));
				fresh.current = next.filter((r, i) => !had.has(keyOf(r, i))).length;
				return next;
			});
		},
		[keyOf],
	);

	// New data: show it, or hold it.
	const lastRows = React.useRef(rows);
	React.useEffect(() => {
		if (lastRows.current === rows) return;
		const before = new Set(lastRows.current.map(keyOf));
		const added = rows.filter((r, i) => !before.has(keyOf(r, i))).length;
		lastRows.current = rows;
		if (holding) {
			if (added) announce("held", added);
			return;
		}
		letIn(rows);
		if (added) announce("shown", added);
	}, [rows, holding, keyOf, letIn, announce]);

	// Stopped reading (and not paused): what waited comes in. Only a change of `holding` lets rows in;
	// rows arriving while not holding are handled above.
	const letWaitingIn = React.useEffectEvent(() => {
		if (waiting) letIn(rows);
	});
	React.useEffect(() => {
		if (!holding) letWaitingIn();
	}, [holding]);

	// The rows that just arrived glow softly once, then settle.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is the trigger — each new set of shown rows plays the glow for the `fresh.current` rows letIn counted.
	React.useEffect(() => {
		const n = fresh.current;
		fresh.current = 0;
		const el = scroller.current;
		if (!n || !el?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const timing = {
			duration: motionToken(el, "--q-dur-expand"),
			easing: motionToken(el, "--q-ease-soft") as string,
		};
		const glow = getComputedStyle(el).getPropertyValue("--q-streaming-table-fresh-bg").trim();
		[...el.querySelectorAll("tbody tr")].slice(0, n).forEach((tr) => {
			tr.animate(
				[
					{ opacity: 0, background: glow },
					{ opacity: 1, background: glow, offset: 0.4 },
					{ opacity: 1, background: "transparent" },
				],
				{ ...timing, duration: Number(timing.duration) * 4 },
			);
		});
	}, [shown]);

	const setPaused = (p: boolean) => {
		setInnerPaused(p);
		onPausedChange?.(p);
	};
	const showWaiting = () => {
		letIn(rows);
		setSaid("");
		if (scroller.current) {
			scroller.current.scrollTop = 0;
			setScrolled(false);
		}
	};
	const visible = maxRows ? shown.slice(0, maxRows) : shown;
	const cls = ["q-streaming-table", className].filter(Boolean).join(" ");
	return (
		<div className={cls} data-paused={isPaused || undefined} style={style}>
			<div className="q-streaming-table__bar">
				<span className="q-streaming-table__state">
					<span aria-hidden="true" className="q-streaming-table__dot" />
					{isPaused ? pausedLabel : liveLabel}
				</span>
				<button
					type="button"
					aria-pressed={isPaused}
					onClick={() => setPaused(!isPaused)}
					className="q-streaming-table__toggle"
				>
					{isPaused ? resumeLabel : pauseLabel}
				</button>
			</div>
			{waiting > 0 && (
				<button
					type="button"
					onClick={showWaiting}
					className="q-streaming-table__waiting q-anim-drop"
					data-state="open"
				>
					<span aria-hidden="true" className="q-streaming-table__arrow">
						{"↑"}
					</span>
					{newLabel(waiting)}
				</button>
			)}
			<div
				ref={scroller}
				className="q-streaming-table__scroll"
				style={
					maxHeight != null
						? ({
								"--_max-height": typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
							} as React.CSSProperties)
						: undefined
				}
				tabIndex={maxHeight != null ? 0 : undefined}
				role={maxHeight != null ? "region" : undefined}
				aria-label={maxHeight != null ? label || "Live rows" : undefined}
				onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
				onFocus={() => setFocused(true)}
				onBlur={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
				}}
			>
				<Table
					columns={columns}
					data={visible}
					rowKey={rowKey}
					caption={caption}
					label={label}
					size={size}
				/>
			</div>
			<span role="status" className="q-sr-only">
				{said}
			</span>
		</div>
	);
}
