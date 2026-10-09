import React from "react";
import { Badge } from "../core/Badge";
import { HoldButton } from "./HoldButton";
import "./Approval.scss";

/**
 * Replaces the confirm dialog. Shows exactly what changes (before → after), how far it reaches,
 * and how long it stays undoable; the commit is a hold-to-confirm key.
 * @startingPoint section="Future" subtitle="Approve an agent's plan" viewport="760x320"
 */
export interface ApprovalChange {
	id?: string | number;
	/** What changes, e.g. a campaign name */
	label: React.ReactNode;
	/** Current state — strings render as a quiet badge */
	before: React.ReactNode;
	/** Resulting state — strings render as an outline badge */
	after: React.ReactNode;
	/** Blast radius for this row, e.g. "1,240 people" (mono, right-aligned) */
	meta?: React.ReactNode;
}
export interface ApprovalConsequence {
	/** Optional leading glyph, e.g. "↺" */
	glyph?: string;
	label: React.ReactNode;
}
export interface ApprovalProps {
	title: React.ReactNode;
	description?: React.ReactNode;
	changes?: ApprovalChange[];
	/** Undo window, notices sent, etc. Plain strings are fine */
	consequences?: Array<ApprovalConsequence | string>;
	/** Label on the hold button */
	confirmLabel?: React.ReactNode;
	/** Label once held, e.g. "Paused · undo for 24h" */
	confirmedLabel?: React.ReactNode;
	onConfirm?: () => void;
	/** Hold duration in ms (default 900) */
	holdDuration?: number;
	/** Shown beside the hold button until confirmed, e.g. an "Edit plan" ghost Button */
	secondaryAction?: React.ReactNode;
	/** Controlled confirmed state */
	confirmed?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

const chip = (v: React.ReactNode, variant: "secondary" | "outline") =>
	typeof v === "string" || typeof v === "number" ? (
		<Badge size="sm" variant={variant}>
			{v}
		</Badge>
	) : (
		v
	);

// Replaces "Are you sure?" with what will actually happen: each change as before → after, its
// reach, and how long it stays undoable. The commit is a HoldButton.
export function Approval({
	title,
	description,
	changes = [],
	consequences = [],
	confirmLabel = "Confirm",
	confirmedLabel = "Done",
	onConfirm,
	holdDuration,
	secondaryAction,
	confirmed,
	className,
	style,
}: ApprovalProps) {
	const uid = React.useId();
	const [inner, setInner] = React.useState(false);
	const done = confirmed ?? inner;
	return (
		<section
			aria-labelledby={`${uid}t`}
			aria-describedby={description ? `${uid}d` : undefined}
			className={["q-approval", className].filter(Boolean).join(" ")}
			style={style}
		>
			<header className="q-approval__header">
				<h3 id={`${uid}t`} className="q-approval__title">
					{title}
				</h3>
				{description && (
					<p id={`${uid}d`} className="q-approval__description">
						{description}
					</p>
				)}
			</header>
			{changes.length > 0 && (
				<ul className="q-approval__changes" aria-label="Changes">
					{changes.map((c, i) => (
						<li key={c.id ?? i} className="q-approval__change">
							<span className="q-approval__change-label">{c.label}</span>
							<span className="q-approval__transition">
								{chip(c.before, "secondary")}
								<span aria-hidden="true" className="q-approval__arrow">
									{"→"}
								</span>
								<span className="q-sr-only">to</span>
								{chip(c.after, "outline")}
							</span>
							{c.meta != null && <span className="q-approval__change-meta">{c.meta}</span>}
						</li>
					))}
				</ul>
			)}
			<footer className="q-approval__footer">
				{consequences.length > 0 && (
					<ul className="q-approval__consequences" aria-label="Consequences">
						{consequences.map((c, i) => (
							<li key={i} className="q-approval__consequence">
								{(c as ApprovalConsequence).glyph && (
									<span aria-hidden="true" className="q-approval__glyph">
										{(c as ApprovalConsequence).glyph}
									</span>
								)}
								{((c as ApprovalConsequence).label ?? c) as React.ReactNode}
							</li>
						))}
					</ul>
				)}
				<div className="q-approval__actions">
					{!done && secondaryAction}
					<HoldButton
						size="sm"
						duration={holdDuration}
						confirmed={done}
						confirmedLabel={confirmedLabel}
						onConfirm={() => {
							setInner(true);
							onConfirm?.();
						}}
					>
						{confirmLabel}
					</HoldButton>
				</div>
			</footer>
		</section>
	);
}
