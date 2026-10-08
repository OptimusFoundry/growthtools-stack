import React from "react";
import { FormValues } from "../../a11y/form";
import { useMergedRef, usePresence } from "../../a11y/hooks";
import "./MultiSelect.scss";

/**
 * Multi-value select. Chosen values show as removable mono pills; menu has checkboxes, filter, and clear.
 * @startingPoint section="Forms" subtitle="Multi-value select" viewport="600x460"
 */
export interface MultiSelectProps {
	label?: React.ReactNode;
	options: Array<
		| string
		| { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }
		| { divider: true }
	>;
	value?: string[];
	defaultValue?: string[];
	onChange?: (value: string[]) => void;
	placeholder?: string;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "filled";
	fullWidth?: boolean;
	/** Pills before collapsing to +n */
	maxDisplay?: number;
	/** Filter box; on automatically above 8 options */
	searchable?: boolean;
	disabled?: boolean;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	/** Submits one hidden input per chosen value (read with FormData.getAll) */
	name?: string;
	/** Blocks native submission while empty; also sets aria-required */
	required?: boolean;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the role="combobox" element, so it can be focused */
	ref?: React.Ref<HTMLSpanElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];
/** An option after norm(): a divider, or an item (string options become { value, label }) */
type MultiSelectItem =
	| {
			value: string;
			label: React.ReactNode;
			description?: React.ReactNode;
			disabled?: boolean;
			divider?: undefined;
	  }
	| {
			divider: true;
			value?: undefined;
			label?: undefined;
			description?: undefined;
			disabled?: undefined;
	  };
type MultiSelectOption = Exclude<MultiSelectItem, { divider: true }>;
const norm = (o: MultiSelectProps["options"][number]): MultiSelectItem =>
	typeof o === "string" ? { value: o, label: o } : o;
const text = (o: MultiSelectItem) =>
	typeof o.label === "string" || typeof o.label === "number"
		? String(o.label)
		: String(o.value ?? "");
const reduced = () =>
	typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function MultiSelect({
	label,
	options = [],
	value,
	defaultValue = [],
	onChange,
	placeholder = "Select",
	size = "md",
	variant = "default",
	fullWidth = false,
	maxDisplay = 3,
	searchable,
	disabled = false,
	helperText,
	error,
	name,
	required,
	form,
	ref: forwardedRef,
	className,
	style,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [inner, setInner] = React.useState(defaultValue);
	const [q, setQ] = React.useState("");
	const [active, setActive] = React.useState(-1);
	const [fresh, setFresh] = React.useState<string[]>([]); // values added since mount: their pills fade in
	const [gone, setGone] = React.useState<{ o: MultiSelectOption; at: number }[]>([]); // removed pills fading out: { o, at }
	const ref = React.useRef<HTMLDivElement>(null);
	const combo = React.useRef<HTMLSpanElement>(null);
	const comboRef = useMergedRef(combo, forwardedRef);
	const uid = React.useId();
	const listId = `${uid}list`,
		labelId = `${uid}label`,
		hintId = `${uid}hint`,
		sumId = `${uid}sum`;
	const optId = React.useCallback((i: number) => `${uid}opt${i}`, [uid]);
	const presence = usePresence(open);
	const cur = value ?? inner;
	const opts = options.map(norm);
	const canSearch = searchable ?? opts.length > 8;
	React.useEffect(() => {
		if (!open) return;
		const h = (e: MouseEvent) =>
			ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [open]);
	React.useEffect(() => {
		if (!open || active < 0) return;
		const el = document.getElementById(optId(active));
		el?.scrollIntoView?.({ block: "nearest" });
	}, [open, active, optId]);
	const set = (next: string[]) => {
		setInner(next);
		onChange?.(next);
	};
	const leave = (o: MultiSelectOption, at: number) => {
		if (at < 0 || at >= maxDisplay) return;
		setGone((g) => [...g, { o, at }]);
		setTimeout(() => setGone((g) => g.filter((x) => x.o !== o)), reduced() ? 0 : 160);
	};
	const toggle = (o: MultiSelectOption) => {
		if (o.disabled) return;
		const on = cur.includes(o.value);
		if (on)
			leave(
				o,
				chosen.findIndex((c) => c.value === o.value),
			);
		else {
			setFresh((f) => [...f, o.value]);
			setGone((g) => g.filter((x) => x.o.value !== o.value));
		}
		set(on ? cur.filter((v) => v !== o.value) : [...cur, o.value]);
	};
	const clear = () => {
		chosen.forEach((o, i) => {
			leave(o, i);
		});
		set([]);
	};
	const chosen = opts.filter((o) => !o.divider && cur.includes(o.value)) as MultiSelectOption[];
	const shown = opts.filter((o) =>
		o.divider ? !q : String(o.label).toLowerCase().includes(q.toLowerCase()),
	);
	const show = () => {
		const i = opts.findIndex((o) => !o.divider && !o.disabled && cur.includes(o.value));
		setQ("");
		setActive(i >= 0 ? i : opts.findIndex((o) => !o.divider && !o.disabled));
		setOpen(true);
	};
	// Keyboard removal moves focus to the next pill's remove button, or back to the field.
	const removeByKey = (o: MultiSelectOption, i: number) => {
		toggle(o);
		requestAnimationFrame(() => {
			const b = ref.current?.querySelectorAll<HTMLElement>('[data-pill-remove][tabindex="0"]');
			((b && (b[i] || b[i - 1])) || combo.current)!.focus();
		});
	};
	const key = (e: React.KeyboardEvent<HTMLElement>) => {
		const sel = shown.map((o, i) => (!o.divider && !o.disabled ? i : -1)).filter((i) => i >= 0),
			k = e.key,
			inInput = (e.target as HTMLElement).tagName === "INPUT";
		if (!open) {
			if (k === "Enter" || k === " " || k === "ArrowDown" || k === "ArrowUp") {
				e.preventDefault();
				show();
			}
			return;
		}
		if (k === "ArrowDown" || k === "ArrowUp") {
			e.preventDefault();
			const p = sel.indexOf(active);
			const n = k === "ArrowDown" ? sel[Math.min(sel.length - 1, p + 1)] : sel[Math.max(0, p - 1)];
			setActive(n ?? sel[0] ?? -1);
		} else if ((k === "Home" || k === "End") && !inInput) {
			e.preventDefault();
			setActive((k === "Home" ? sel[0] : sel[sel.length - 1])!);
		} else if (k === "Enter" || (k === " " && !inInput)) {
			e.preventDefault();
			if (active >= 0 && shown[active]) toggle(shown[active] as MultiSelectOption);
		} else if (k === "Backspace" && inInput && !q && chosen.length) {
			e.preventDefault();
			toggle(chosen[chosen.length - 1]!);
		} else if (k === "Tab" && !inInput) setOpen(false);
	};
	const pills = chosen.slice(0, maxDisplay).map((o) => ({ o, ghost: false }));
	gone.forEach((g) => {
		pills.splice(Math.min(g.at, pills.length), 0, { o: g.o, ghost: true });
	});
	const chip = ({ o, ghost }: { o: MultiSelectOption; ghost: boolean }, i: number) => (
		<span
			key={(ghost ? "g:" : "") + o.value}
			className={`q-multi-select__pill${ghost || fresh.includes(o.value) ? " q-anim-fade" : ""}`}
			data-state={ghost ? "closing" : fresh.includes(o.value) ? "open" : undefined}
			aria-hidden={ghost || undefined}
		>
			{o.label}
			<span
				role="button"
				data-pill-remove
				tabIndex={ghost || disabled ? -1 : 0}
				aria-label={`Remove ${text(o)}`}
				aria-disabled={disabled || undefined}
				onClick={(e) => {
					e.stopPropagation();
					if (!disabled && !ghost) toggle(o);
				}}
				onKeyDown={(e) => {
					if (["Enter", " ", "Delete", "Backspace"].includes(e.key)) {
						e.preventDefault();
						e.stopPropagation();
						if (!disabled && !ghost) removeByKey(o, i - gone.filter((g) => g.at <= i).length);
					}
				}}
				className="q-multi-select__pill-remove"
			>
				{"\u00d7"}
			</span>
		</span>
	);
	const cls = [
		"q-multi-select",
		`q-multi-select--${SIZES.includes(size) ? size : "md"}`,
		variant === "filled" && "q-multi-select--filled",
		fullWidth && "q-multi-select--full",
		error && "q-multi-select--invalid",
		disabled && "q-multi-select--disabled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div
			ref={ref}
			onKeyDown={(e) => {
				if (open && e.key === "Escape") {
					e.stopPropagation();
					setOpen(false);
					combo.current?.focus();
				}
			}}
			onBlur={(e) =>
				open &&
				ref.current &&
				!ref.current.contains(e.relatedTarget as Node | null) &&
				setOpen(false)
			}
			className={cls}
			style={style}
		>
			{label && (
				<span id={labelId} className="q-multi-select__label">
					{label}
				</span>
			)}
			<div
				onClick={() => !disabled && (open ? setOpen(false) : show())}
				className="q-multi-select__field"
			>
				{/* quiet: the focusable combobox is a transparent layer over the field, so the pills' remove buttons are not nested inside it */}
				<span
					ref={comboRef}
					role="combobox"
					aria-required={required || undefined}
					tabIndex={disabled ? -1 : 0}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={open || presence.mounted ? listId : undefined}
					aria-activedescendant={open && !canSearch && active >= 0 ? optId(active) : undefined}
					aria-labelledby={label ? labelId : undefined}
					aria-label={label ? undefined : placeholder}
					aria-describedby={sumId + (error || helperText ? ` ${hintId}` : "")}
					aria-invalid={error ? true : undefined}
					aria-disabled={disabled || undefined}
					onKeyDown={key}
					className="q-multi-select__combo"
				/>
				<span id={sumId} className="q-sr-only">
					{chosen.length ? chosen.map(text).join(", ") : "None selected"}
				</span>
				<span className="q-multi-select__values">
					{chosen.length === 0 && gone.length === 0 ? placeholder : pills.map(chip)}
					{chosen.length > maxDisplay && (
						<span className="q-multi-select__more">+{chosen.length - maxDisplay}</span>
					)}
				</span>
				<span aria-hidden="true" className="q-multi-select__chevron">
					{"\u2193"}
				</span>
			</div>
			{(open || presence.mounted) && (
				<div
					className="q-multi-select__panel q-anim-drop"
					data-state={open ? "open" : presence.state}
					onMouseDown={(e) => (e.target as HTMLElement).tagName !== "INPUT" && e.preventDefault()}
				>
					{canSearch && (
						<input
							autoFocus
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setActive(-1);
							}}
							placeholder="Filter"
							aria-label="Filter options"
							role="combobox"
							aria-expanded={open}
							aria-controls={listId}
							aria-autocomplete="list"
							aria-activedescendant={
								open && active >= 0 && shown[active] ? optId(active) : undefined
							}
							onKeyDown={key}
							className="q-multi-select__search"
						/>
					)}
					<div
						id={listId}
						role="listbox"
						aria-multiselectable="true"
						aria-labelledby={label ? labelId : undefined}
						className="q-multi-select__list"
					>
						{shown.map((o, i) =>
							o.divider ? (
								<div key={`d${i}`} className="q-multi-select__divider" />
							) : (
								<MSOption
									key={o.value}
									id={optId(i)}
									o={o}
									on={cur.includes(o.value)}
									act={active === i}
									onHover={() => setActive(i)}
									onPick={() => toggle(o)}
								/>
							),
						)}
						{shown.length === 0 && <div className="q-multi-select__empty">No matches</div>}
					</div>
					<div className="q-multi-select__footer">
						<span aria-live="polite">{cur.length} selected</span>
						<button type="button" onClick={clear} className="q-multi-select__clear">
							Clear
						</button>
					</div>
				</div>
			)}
			{(error || helperText) && (
				<span
					id={hintId}
					className={`q-multi-select__hint${error ? " q-multi-select__hint--error" : ""}`}
				>
					{error || helperText}
				</span>
			)}
			<FormValues
				name={name}
				values={cur}
				required={required}
				disabled={disabled}
				form={form}
				focusTarget={() => combo.current}
			/>
		</div>
	);
}

function MSOption({
	id,
	o,
	on,
	act,
	onHover,
	onPick,
}: {
	id: string;
	o: MultiSelectOption;
	on: boolean;
	act: boolean;
	onHover?: () => void;
	onPick: () => void;
}) {
	return (
		<div
			id={id}
			role="option"
			aria-selected={on}
			aria-disabled={o.disabled || undefined}
			data-active={act || undefined}
			onClick={onPick}
			onMouseEnter={() => onHover?.()}
			className="q-multi-select__option"
		>
			<span aria-hidden="true" className="q-multi-select__box">
				{on ? "\u2713" : ""}
			</span>
			<span className="q-multi-select__option-text">
				<span>{o.label}</span>
				{o.description && (
					<span className="q-multi-select__option-description">{o.description}</span>
				)}
			</span>
		</div>
	);
}
