import React from "react";
import { Avatar } from "../core/Avatar";
import { Button } from "../core/Button";
import { FilterTabs } from "../data/FilterTabs";
import { Switch } from "../forms/Switch";
import "./ScopeGrant.scss";

/**
 * Narrow, time-boxed permission for an agent, in plain words: a switch per scope, one duration,
 * and a footer that says what it can't do. Grant hands the set over; Revoke takes it all back.
 * @startingPoint section="Future" subtitle="What an agent may do, and for how long" viewport="680x420"
 */
export interface Scope {
	id: string;
	/** Plain words, e.g. "Publish to Bluesky, X, Threads" */
	label: React.ReactNode;
	/** Word used in the "can't …" footer (default: the label's first word, lowercased) */
	short?: string;
	/** Second line under the label */
	description?: React.ReactNode;
	/** When off, the agent asks first instead of being unable — shown as "Asks first" */
	asks?: boolean;
	/** On by default (uncontrolled) */
	defaultGranted?: boolean;
}
export interface ScopeGrantDuration {
	value: string;
	label: React.ReactNode;
	/** Footer phrase, e.g. "expires at midnight" */
	expires?: string;
}
export interface ScopeGrantProps {
	/**
	 * Mark for the agent; decorative (the title carries the name). A string renders as a square
	 * Avatar with its initials, e.g. `agent="Meerkat"`; pass a node for anything else.
	 */
	agent?: React.ReactNode;
	title: React.ReactNode;
	/** Mono line under the title, e.g. "Scoped to this workspace" */
	caption?: React.ReactNode;
	scopes: Scope[];
	/** Granted scope ids */
	value?: string[];
	defaultValue?: string[];
	onChange?: (ids: string[]) => void;
	durations?: ScopeGrantDuration[];
	duration?: string;
	defaultDuration?: string;
	onDurationChange?: (value: string) => void;
	onGrant?: (grant: { scopes: string[]; duration?: string }) => void;
	/** Shown once `granted` */
	onRevoke?: () => void;
	/** The grant is live: Grant becomes Update, Revoke appears, the grant is announced */
	granted?: boolean;
	grantLabel?: string;
	revokeLabel?: string;
	className?: string;
	style?: React.CSSProperties;
}

const first = (s: string) => s.split(" ")[0]!.toLowerCase();

// Narrow, time-boxed permission for an agent, in plain words. The footer says what it can't do,
// because that is the part people actually want to read. Every scope is a switch; the duration is
// one choice; Grant hands the set over and Revoke takes it all back.
export function ScopeGrant({
	agent,
	title,
	caption,
	scopes = [],
	value,
	defaultValue,
	onChange,
	durations = [],
	duration,
	defaultDuration,
	onDurationChange,
	onGrant,
	onRevoke,
	granted = false,
	grantLabel = "Grant",
	revokeLabel = "Revoke all",
	className,
	style,
}: ScopeGrantProps) {
	const [innerSet, setInnerSet] = React.useState<string[]>(
		() => defaultValue ?? scopes.filter((s) => s.defaultGranted).map((s) => s.id),
	);
	const on = value ?? innerSet;
	const [innerDur, setInnerDur] = React.useState<string | undefined>(
		defaultDuration ?? durations[0]?.value,
	);
	const dur = duration ?? innerDur;
	const uid = React.useId();
	const toggle = (id: string, v: boolean) => {
		const next = v ? [...on.filter((x) => x !== id), id] : on.filter((x) => x !== id);
		setInnerSet(next);
		onChange?.(next);
	};
	const pickDur = (d: string) => {
		setInnerDur(d);
		onDurationChange?.(d);
	};
	const d = durations.find((x) => x.value === dur);
	const cant = scopes.filter((s) => !on.includes(s.id));
	const cantText = cant.length
		? cant.map((s) => s.short ?? first(s.label as string)).join(", ")
		: "nothing";
	return (
		<section
			aria-labelledby={`${uid}t`}
			className={["q-scope-grant", className].filter(Boolean).join(" ")}
			data-granted={granted || undefined}
			style={style}
		>
			<header className="q-scope-grant__header">
				<div className="q-scope-grant__who">
					{agent && (
						<span aria-hidden="true" className="q-scope-grant__agent">
							{typeof agent === "string" ? <Avatar name={agent} size="sm" shape="square" /> : agent}
						</span>
					)}
					<div className="q-scope-grant__heading">
						<h3 id={`${uid}t`} className="q-scope-grant__title">
							{title}
						</h3>
						{caption && <span className="q-scope-grant__caption">{caption}</span>}
					</div>
				</div>
				{durations.length > 0 && (
					<FilterTabs
						size="sm"
						label="How long"
						showCounts={false}
						items={durations.map((x) => ({ value: x.value, label: x.label }))}
						value={dur}
						onChange={pickDur}
					/>
				)}
			</header>
			<ul className="q-scope-grant__scopes">
				{scopes.map((s) => {
					const yes = on.includes(s.id);
					return (
						<li key={s.id} className="q-scope-grant__scope" data-on={yes || undefined}>
							<Switch
								size="sm"
								labelPosition="left"
								checked={yes}
								onChange={(v) => toggle(s.id, v)}
								label={s.label}
								description={!yes && s.asks ? "Asks first" : s.description}
								className="q-scope-grant__switch"
							/>
						</li>
					);
				})}
			</ul>
			<footer className="q-scope-grant__footer">
				<p className="q-scope-grant__summary">
					Can {on.length} · <span className="q-scope-grant__cant">can't {cantText}</span>
					{d?.expires ? ` · ${d.expires}` : ""}
				</p>
				<div className="q-scope-grant__actions">
					{granted && onRevoke && (
						<Button size="sm" variant="ghost" onClick={onRevoke}>
							{revokeLabel}
						</Button>
					)}
					{onGrant && (
						<Button
							size="sm"
							variant={granted ? "secondary" : "primary"}
							onClick={() => onGrant({ scopes: on, duration: dur })}
						>
							{granted ? "Update" : grantLabel}
						</Button>
					)}
				</div>
			</footer>
			<p role="status" className="q-sr-only">
				{granted
					? "Granted: can " +
						on.length +
						", can't " +
						cantText +
						(d?.expires ? `, ${d.expires}` : "")
					: ""}
			</p>
		</section>
	);
}
