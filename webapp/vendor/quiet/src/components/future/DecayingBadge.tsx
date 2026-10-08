import React from "react";
import "./DecayingBadge.scss";

/**
 * A status badge whose fact ages. It fades from ink toward grey over `staleAfter`, then strikes
 * itself through; with `onRecheck` it is the button that refreshes the fact.
 * @startingPoint section="Future" subtitle="Status that shows its age" viewport="700x180"
 */
export interface DecayingBadgeProps {
	/** What was true when someone looked */
	children?: React.ReactNode;
	/** When the fact was last confirmed; missing means never */
	checkedAt?: Date | number | string;
	/** Milliseconds until the fact counts as stale (default 72 hours) */
	staleAfter?: number;
	/** Current time in ms; defaults to the clock, refreshed every 30s */
	now?: number;
	/** Shown, struck through, once stale */
	staleLabel?: React.ReactNode;
	/** Makes the badge a button that re-confirms the fact */
	onRecheck?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	/** A re-check is in flight */
	checking?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];
const HOUR = 3600e3;
const UNITS: [Intl.RelativeTimeFormatUnit, number, string][] = [
	["day", 24 * HOUR, "d"],
	["hour", HOUR, "h"],
	["minute", 60e3, "m"],
];
const rtf =
	typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;

// "3 days ago" for the accessible name, "3d" for the visible stamp.
function age(ms: number) {
	for (const [unit, size, short] of UNITS) {
		if (ms >= size) {
			const n = Math.floor(ms / size);
			return { long: rtf ? rtf.format(-n, unit) : `${n} ${unit}s ago`, short: n + short };
		}
	}
	return { long: "just now", short: "now" };
}

// A status badge whose fact ages: it fades from ink toward grey over `staleAfter`, then strikes
// itself through. With `onRecheck` it becomes the button that refreshes the fact.
export function DecayingBadge({
	children = "Verified",
	checkedAt,
	staleAfter = 72 * HOUR,
	now,
	staleLabel = "Unknown",
	onRecheck,
	checking = false,
	size = "md",
	className,
	style,
}: DecayingBadgeProps) {
	const [clock, setClock] = React.useState(() => Date.now());
	React.useEffect(() => {
		if (now != null) return;
		const t = setInterval(() => setClock(Date.now()), 30e3);
		return () => clearInterval(t);
	}, [now]);
	const at = checkedAt == null ? NaN : new Date(checkedAt).getTime();
	const elapsed = Number.isNaN(at) ? staleAfter : Math.max(0, (now ?? clock) - at);
	const decay = Math.min(1, elapsed / staleAfter);
	const stale = decay >= 1;
	const a = age(elapsed);
	const known = !Number.isNaN(at);
	const name =
		(stale ? `${staleLabel}, ${children} expired` : children) +
		(known ? `, checked ${a.long}` : ", never checked");
	const cls = [
		"q-decaying-badge",
		`q-decaying-badge--${SIZES.includes(size) ? size : "md"}`,
		onRecheck && "q-decaying-badge--action",
		className,
	]
		.filter(Boolean)
		.join(" ");
	const inner = (
		<>
			<span aria-hidden="true" className="q-decaying-badge__dot" />
			<span aria-hidden="true" className="q-decaying-badge__label">
				{stale ? staleLabel : children}
			</span>
			{known && !stale && (
				<span aria-hidden="true" className="q-decaying-badge__age">
					{a.short}
				</span>
			)}
		</>
	);
	const props = {
		className: cls,
		"data-stale": stale || undefined,
		"data-checking": checking || undefined,
		style: { "--_fresh": 1 - decay, ...style } as React.CSSProperties,
	};
	return onRecheck ? (
		<button
			type="button"
			{...props}
			onClick={onRecheck}
			disabled={checking}
			aria-busy={checking || undefined}
			aria-label={`${name}. Re-check`}
			title="Re-check"
		>
			{inner}
		</button>
	) : (
		<span {...props}>
			{inner}
			<span className="q-sr-only">{name}</span>
		</span>
	);
}
