import React from "react";
import { Button } from "../core/Button";
import { Skeleton } from "../core/Skeleton";
import { DropdownMenu } from "../overlays/DropdownMenu";
import "./IntentBar.scss";

/**
 * Free text in; how the system read it comes back as editable chips before anything runs — the
 * chips are the form, filled in for you. Reading the text is the caller's job: set `status` to
 * "reading" while you work it out, then pass the interpretation as `chips` with `status="read"`.
 * @startingPoint section="Future" subtitle="Say it, then check how it was read" viewport="760x220"
 */
export interface IntentChip {
	key?: string;
	/** Mono key, e.g. "Action" */
	label: string;
	/** Current reading, e.g. "Pause" */
	value: string;
	/** Alternatives; with two or more the chip opens a menu to switch */
	options?: string[];
}
export interface IntentBarProps {
	value?: string;
	defaultValue?: string;
	onChange?: (text: string) => void;
	/** Enter or the Read button */
	onSubmit?: (text: string) => void;
	/** idle → reading (skeleton chips) → read (chips + footer) */
	status?: "idle" | "reading" | "read";
	chips?: IntentChip[];
	/** A chip's option was picked */
	onChipChange?: (key: string | number, value: string) => void;
	/** What the reading matches, e.g. "Matches 3 campaigns" */
	summary?: React.ReactNode;
	/** Buttons that act on the reading (shown once read) */
	actions?: React.ReactNode;
	/** Example requests shown while idle; picking one fills the field */
	suggestions?: string[];
	placeholder?: string;
	/** Accessible name of the field (default "What do you want done?") */
	label?: string;
	submitLabel?: string;
	resubmitLabel?: string;
	className?: string;
	style?: React.CSSProperties;
}

// Say what you want; the system shows how it understood it as editable chips before anything
// runs. The chips are the form, written for you. Reading the text is the caller's job: pass the
// interpretation back as `chips`, and set `status` while you work it out.
export function IntentBar({
	value,
	defaultValue = "",
	onChange,
	onSubmit,
	status = "idle",
	chips = [],
	onChipChange,
	summary,
	actions,
	suggestions = [],
	placeholder = "Say what you want done",
	label = "What do you want done?",
	submitLabel = "Read",
	resubmitLabel = "Re-read",
	className,
	style,
}: IntentBarProps) {
	const [inner, setInner] = React.useState(defaultValue);
	const text = value ?? inner;
	const uid = React.useId();
	const set = (t: string) => {
		setInner(t);
		onChange?.(t);
	};
	const submit = () => {
		if (text.trim() && status !== "reading") onSubmit?.(text);
	};
	const read = status === "read";
	const reading = status === "reading";
	const said =
		read && chips.length
			? `Read as: ${chips.map((c) => `${c.label} ${c.value}`).join(", ")}`
			: reading
				? "Reading…"
				: "";
	return (
		<div
			className={["q-intent-bar", className].filter(Boolean).join(" ")}
			data-status={status}
			style={style}
		>
			<form
				role="search"
				aria-label={label}
				className="q-intent-bar__field"
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
			>
				<span aria-hidden="true" className="q-intent-bar__mark" />
				<input
					value={text}
					onChange={(e) => set(e.target.value)}
					placeholder={placeholder}
					aria-label={label}
					aria-describedby={`${uid}s`}
					className="q-intent-bar__input"
				/>
				<Button
					type="submit"
					size="sm"
					variant={read ? "secondary" : "primary"}
					loading={reading}
					disabled={!text.trim()}
				>
					{read ? resubmitLabel : submitLabel}
				</Button>
			</form>
			<p id={`${uid}s`} role="status" className="q-sr-only">
				{said}
			</p>
			{reading && (
				<div aria-hidden="true" className="q-intent-bar__chips">
					{[72, 128, 136, 80].map((w, i) => (
						<Skeleton key={i} variant="rounded" width={w} height={30} />
					))}
				</div>
			)}
			{read && chips.length > 0 && (
				<>
					<ul aria-label="How it was read" className="q-intent-bar__chips">
						{chips.map((c, i) => (
							<li
								key={c.key ?? i}
								className="q-intent-bar__chip-item"
								style={{ "--_i": i } as React.CSSProperties}
							>
								{c.options && c.options.length > 1 ? (
									<DropdownMenu
										size="sm"
										label={c.label}
										width={220}
										items={c.options.map((o) => ({
											label: o,
											checked: o === c.value,
											onSelect: () => onChipChange?.(c.key ?? i, o),
										}))}
										trigger={
											<button type="button" className="q-intent-bar__chip">
												<span className="q-intent-bar__chip-key">{c.label}</span>
												<span className="q-intent-bar__chip-value">{c.value}</span>
												<span aria-hidden="true" className="q-intent-bar__chip-caret" />
											</button>
										}
									/>
								) : (
									<span className="q-intent-bar__chip q-intent-bar__chip--fixed">
										<span className="q-intent-bar__chip-key">{c.label}</span>
										<span className="q-intent-bar__chip-value">{c.value}</span>
									</span>
								)}
							</li>
						))}
					</ul>
					{(summary || actions) && (
						<div className="q-intent-bar__footer">
							{summary && <span className="q-intent-bar__summary">{summary}</span>}
							{actions && <div className="q-intent-bar__actions">{actions}</div>}
						</div>
					)}
				</>
			)}
			{status === "idle" && suggestions.length > 0 && (
				<ul aria-label="Try" className="q-intent-bar__suggestions">
					{suggestions.map((s) => (
						<li key={s}>
							<button type="button" className="q-intent-bar__suggestion" onClick={() => set(s)}>
								{s}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
