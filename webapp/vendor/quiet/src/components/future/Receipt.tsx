import React from "react";
import "./Receipt.scss";

/**
 * A receipt instead of a toast: who acted and why, one line per effect, and an undo on every
 * line that can be undone on its own.
 * @startingPoint section="Future" subtitle="What an agent did, line by line" viewport="700x320"
 */
export interface ReceiptLine {
	id?: string;
	/** "Paused", "Sent", "Kept" */
	verb?: React.ReactNode;
	/** What it happened to */
	object: React.ReactNode;
	/** Shows an Undo for this line. Off by default: only effects that can really be taken back say so */
	undoable?: boolean;
	/** Controlled: the effect has been undone */
	undone?: boolean;
}
export interface ReceiptProps {
	/** Who acted, e.g. "Meerkat" */
	actor: React.ReactNode;
	/** When, e.g. "14:02" */
	time?: React.ReactNode;
	/** A short reference, e.g. "#4f2a" */
	reference?: React.ReactNode;
	/** Why it acted */
	reason?: React.ReactNode;
	lines?: ReceiptLine[];
	/** Called when a line is undone; lines without `undone` track it themselves */
	onUndo?: (line: ReceiptLine, index: number) => void;
	undoLabel?: string;
	undoneLabel?: string;
	/** Usually the undo window, e.g. "Reversible until tomorrow 14:02" */
	footer?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

// After an agent acts you get a receipt, not a toast: who did it and why, one line per effect,
// and an undo on every line that can be undone. The receipt is the undo UI.
export function Receipt({
	actor,
	time,
	reference,
	reason,
	lines = [],
	onUndo,
	undoLabel = "Undo",
	undoneLabel = "Undone",
	footer,
	className,
	style,
}: ReceiptProps) {
	const uid = React.useId();
	const [undone, setUndone] = React.useState(() => new Set<string | number>());
	const [said, setSaid] = React.useState("");
	const list = React.useRef<HTMLUListElement>(null);
	// The pressed Undo disappears, so focus moves to that line's text instead of falling to the page.
	const refocus = (i: number) =>
		requestAnimationFrame(() => {
			const el = list.current?.children[i];
			el && (el.firstElementChild as HTMLElement).focus();
		});
	const isUndone = (l: ReceiptLine, i: number) => l.undone ?? undone.has(l.id ?? i);
	const undo = (l: ReceiptLine, i: number) => {
		if (l.undone == null) setUndone((s) => new Set(s).add(l.id ?? i));
		setSaid(`${undoneLabel}: ${[l.verb, l.object].filter(Boolean).join(" ")}`);
		onUndo?.(l, i);
		refocus(i);
	};
	return (
		<article
			aria-labelledby={`${uid}t`}
			className={["q-receipt", className].filter(Boolean).join(" ")}
			style={style}
		>
			<header className="q-receipt__header">
				<h3 id={`${uid}t`} className="q-receipt__title">
					{actor}
					{time && <span className="q-receipt__time"> · {time}</span>}
				</h3>
				{reference && <span className="q-receipt__ref">{reference}</span>}
			</header>
			{reason && <p className="q-receipt__reason">{reason}</p>}
			<ul ref={list} className="q-receipt__lines" aria-label="Effects">
				{lines.map((l, i) => {
					const off = isUndone(l, i);
					const what = [l.verb, l.object].filter(Boolean).join(" ");
					return (
						<li key={l.id ?? i} className="q-receipt__line" data-undone={off || undefined}>
							<span className="q-receipt__effect" tabIndex={-1}>
								{l.verb && <span className="q-receipt__verb">{l.verb}</span>} {l.object}
								{off && <span className="q-sr-only"> ({undoneLabel.toLowerCase()})</span>}
							</span>
							{off ? (
								<span aria-hidden="true" className="q-receipt__mark">
									{undoneLabel}
								</span>
							) : !l.undoable ? (
								<span aria-hidden="true" className="q-receipt__mark">
									{"—"}
								</span>
							) : (
								<button
									type="button"
									className="q-receipt__undo"
									onClick={() => undo(l, i)}
									aria-label={`${undoLabel}: ${what}`}
								>
									{undoLabel}
								</button>
							)}
						</li>
					);
				})}
			</ul>
			{footer && <footer className="q-receipt__footer">{footer}</footer>}
			<span className="q-sr-only" role="status">
				{said}
			</span>
		</article>
	);
}
