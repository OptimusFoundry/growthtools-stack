import React from "react";
import { FormValue } from "../../a11y/form";
import { useFocusTrap, useMergedRef, usePresence } from "../../a11y/hooks";
import "./DatePicker.scss";

/**
 * Date field with a rounded month calendar. Today = molten dot, selected = ink circle.
 * @startingPoint section="Forms" subtitle="Calendar date picker" viewport="600x500"
 */
export interface DatePickerProps {
	label?: React.ReactNode;
	value?: Date | null;
	defaultValue?: Date | null;
	onChange?: (date: Date | null) => void;
	min?: Date;
	max?: Date;
	/** 0 = Sunday, 1 = Monday */
	weekStartsOn?: 0 | 1;
	format?: (date: Date) => string;
	placeholder?: string;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	/** Submits the date as local YYYY-MM-DD (like <input type="date">), or "" when empty */
	name?: string;
	/** Blocks native submission while no date is picked */
	required?: boolean;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the trigger button, so it can be focused */
	ref?: React.Ref<HTMLButtonElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const strip = (d: Date | null | undefined) =>
	d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
const same = (a: Date | null, b: Date | null) =>
	a &&
	b &&
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();
const defFmt = (d: Date) =>
	d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
	const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
	return new Date(
		t.getFullYear(),
		t.getMonth(),
		Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()),
	);
};
// Same wire format as <input type="date">: local YYYY-MM-DD.
const isoDay = (d: Date | null) =>
	d
		? d.getFullYear() +
			"-" +
			String(d.getMonth() + 1).padStart(2, "0") +
			"-" +
			String(d.getDate()).padStart(2, "0")
		: "";
const longFmt = (d: Date) =>
	d.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});

function NavBtn({
	children,
	onClick,
	label,
}: {
	children: React.ReactNode;
	onClick: () => void;
	label: string;
}) {
	return (
		<button type="button" aria-label={label} onClick={onClick} className="q-date-picker__nav">
			{children}
		</button>
	);
}

export function DatePicker({
	label,
	value,
	defaultValue,
	onChange,
	min,
	max,
	weekStartsOn = 0,
	format = defFmt,
	placeholder = "Pick a date",
	size = "md",
	disabled = false,
	helperText,
	error,
	name,
	required,
	form,
	ref: forwardedRef,
	className,
	style,
}: DatePickerProps) {
	const [inner, setInner] = React.useState<Date | null>(defaultValue || null);
	const cur = value !== undefined ? value : inner;
	const [open, setOpen] = React.useState(false);
	const [view, setView] = React.useState(() => {
		const b = cur || new Date();
		return new Date(b.getFullYear(), b.getMonth(), 1);
	});
	const [focus, setFocus] = React.useState<Date | null>(null); // roving day in the grid
	const [paged, setPaged] = React.useState(false); // month changed since opening: crossfade the days
	const ref = React.useRef<HTMLDivElement>(null);
	const dialog = React.useRef<HTMLDivElement>(null);
	const trigger = React.useRef<HTMLButtonElement>(null);
	const triggerRef = useMergedRef(trigger, forwardedRef);
	const moveFocus = React.useRef(false);
	const uid = React.useId();
	const dialogId = `${uid}dialog`,
		labelId = `${uid}label`,
		valueId = `${uid}value`,
		hintId = `${uid}hint`,
		headId = `${uid}head`;
	const presence = usePresence(open);
	const today = strip(new Date())!;
	const lo = strip(min),
		hi = strip(max);
	React.useEffect(() => {
		if (!open) return;
		const h = (e: MouseEvent) =>
			ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [open]);
	useFocusTrap(dialog, open);
	React.useEffect(() => {
		if (!open || !moveFocus.current || !focus) return;
		moveFocus.current = false;
		const b = dialog.current?.querySelector<HTMLElement>(`[data-day="${focus.getTime()}"]`);
		b?.focus();
	}, [open, focus]);
	const pick = (d: Date | null) => {
		setInner(d);
		onChange?.(d);
		setOpen(false);
	};
	const toggleOpen = () => {
		if (open) {
			setOpen(false);
			return;
		}
		const f = strip(cur) || today;
		setView(new Date(f.getFullYear(), f.getMonth(), 1));
		setFocus(f);
		setPaged(false);
		moveFocus.current = true;
		setOpen(true);
	};
	const page = (n: number) => {
		const f = addMonths(focus || view, n);
		setView(new Date(f.getFullYear(), f.getMonth(), 1));
		setFocus(f);
		setPaged(true);
	};
	const gridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!focus) return;
		const k = e.key,
			wd = (focus.getDay() - weekStartsOn + 7) % 7;
		const to =
			k === "ArrowLeft"
				? addDays(focus, -1)
				: k === "ArrowRight"
					? addDays(focus, 1)
					: k === "ArrowUp"
						? addDays(focus, -7)
						: k === "ArrowDown"
							? addDays(focus, 7)
							: k === "Home"
								? addDays(focus, -wd)
								: k === "End"
									? addDays(focus, 6 - wd)
									: k === "PageUp"
										? addMonths(focus, e.shiftKey ? -12 : -1)
										: k === "PageDown"
											? addMonths(focus, e.shiftKey ? 12 : 1)
											: null;
		if (!to) return;
		e.preventDefault();
		if (to.getMonth() !== m || to.getFullYear() !== y) {
			setView(new Date(to.getFullYear(), to.getMonth(), 1));
			setPaged(true);
		}
		moveFocus.current = true;
		setFocus(to);
	};
	const y = view.getFullYear(),
		m = view.getMonth();
	const lead = (new Date(y, m, 1).getDay() - weekStartsOn + 7) % 7;
	const count = new Date(y, m + 1, 0).getDate();
	const cells = [
		...Array(lead).fill(null),
		...Array.from({ length: count }, (_, i) => new Date(y, m, i + 1)),
	];
	const heads = DAYS.slice(weekStartsOn).concat(DAYS.slice(0, weekStartsOn));
	const off = (d: Date) => (lo && d < lo) || (hi && d > hi);
	const tabDay =
		focus && focus.getMonth() === m && focus.getFullYear() === y
			? focus.getTime()
			: (cur && cur.getMonth() === m && cur.getFullYear() === y
					? strip(cur)!
					: new Date(y, m, 1)
				).getTime();
	const weeks: (Date | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	const cls = [
		"q-date-picker",
		`q-date-picker--${SIZES.includes(size) ? size : "md"}`,
		disabled && "q-date-picker--disabled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div ref={ref} className={cls} style={style}>
			{label && (
				<span id={labelId} className="q-date-picker__label">
					{label}
				</span>
			)}
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open || presence.mounted ? dialogId : undefined}
				aria-labelledby={(label ? `${labelId} ` : "") + valueId}
				aria-describedby={error || helperText ? hintId : undefined}
				aria-invalid={error ? true : undefined}
				onClick={toggleOpen}
				className={
					"q-date-picker__trigger" +
					(cur ? "" : " q-date-picker__trigger--placeholder") +
					(error ? " q-date-picker__trigger--invalid" : "")
				}
			>
				<span id={valueId} className="q-date-picker__value">
					{cur ? format(cur) : placeholder}
				</span>
				<span aria-hidden="true" className="q-date-picker__day-badge">
					{cur ? String(cur.getDate()).padStart(2, "0") : "--"}
				</span>
			</button>
			{(open || presence.mounted) && (
				<div
					ref={dialog}
					id={dialogId}
					role="dialog"
					aria-modal="true"
					aria-label="Choose date"
					className="q-date-picker__dialog q-anim-drop"
					data-state={open ? "open" : presence.state}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							e.stopPropagation();
							setOpen(false);
						}
					}}
				>
					<div className="q-date-picker__head">
						<NavBtn label="Previous month" onClick={() => page(-1)}>
							{"\u2190"}
						</NavBtn>
						<span id={headId} aria-live="polite" className="q-date-picker__month">
							{MONTHS[m]} <span className="q-date-picker__year">{y}</span>
						</span>
						<NavBtn label="Next month" onClick={() => page(1)}>
							{"\u2192"}
						</NavBtn>
					</div>
					{/* quiet: rows use display: contents so the grid semantics add no boxes to the 7-column layout */}
					<div
						key={`${y}-${m}`}
						role="grid"
						aria-labelledby={headId}
						onKeyDown={gridKey}
						className={`q-date-picker__grid${paged ? " q-anim-fade" : ""}`}
						data-state={paged ? "open" : undefined}
					>
						<div role="row" className="q-date-picker__row">
							{heads.map((d, i) => (
								<span
									key={`h${i}`}
									role="columnheader"
									aria-label={DAY_NAMES[(i + weekStartsOn) % 7]}
									className="q-date-picker__weekday"
								>
									{d}
								</span>
							))}
						</div>
						{weeks.map((w, r) => (
							<div key={`w${r}`} role="row" className="q-date-picker__row">
								{w.map((d, c) => {
									const i = r * 7 + c;
									if (!d) return <span key={`e${i}`} role="gridcell" />;
									const isSel = same(d, cur),
										isToday = same(d, today),
										dis = off(d),
										k = d.getTime();
									return (
										<span
											key={k}
											role="gridcell"
											aria-selected={isSel as boolean | undefined}
											className="q-date-picker__cell"
										>
											<button
												type="button"
												data-day={k}
												tabIndex={k === tabDay ? 0 : -1}
												aria-disabled={dis || undefined}
												aria-label={longFmt(d)}
												onClick={() => !dis && pick(d)}
												onFocus={() => setFocus(d)}
												aria-current={isToday ? "date" : undefined}
												className="q-date-picker__day"
											>
												{d.getDate()}
												{isToday && <span aria-hidden="true" className="q-date-picker__today" />}
											</button>
										</span>
									);
								})}
							</div>
						))}
					</div>
					<div className="q-date-picker__footer">
						<button
							type="button"
							disabled={off(today) as boolean | undefined}
							onClick={() => pick(today)}
							className="q-date-picker__action"
						>
							Today
						</button>
						<button
							type="button"
							onClick={() => pick(null)}
							className="q-date-picker__action q-date-picker__action--muted"
						>
							Clear
						</button>
					</div>
				</div>
			)}
			{(error || helperText) && (
				<span
					id={hintId}
					className={`q-date-picker__hint${error ? " q-date-picker__hint--error" : ""}`}
				>
					{error || helperText}
				</span>
			)}
			<FormValue
				name={name}
				value={isoDay(cur)}
				required={required}
				disabled={disabled}
				form={form}
				focusTarget={() => trigger.current}
			/>
		</div>
	);
}
