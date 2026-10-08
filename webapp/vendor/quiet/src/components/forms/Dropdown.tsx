import React from "react";
import { FormValue } from "../../a11y/form";
import { useMergedRef, usePresence } from "../../a11y/hooks";
import "./Dropdown.scss";

/**
 * Custom select with a rounded, softly shadowed listbox. Icons, descriptions, dividers, disabled items, keyboard.
 * @startingPoint section="Forms" subtitle="Custom select menu" viewport="600x420"
 */
export interface DropdownProps {
	label?: React.ReactNode;
	options: Array<
		| string
		| {
				value: string;
				label: React.ReactNode;
				description?: React.ReactNode;
				icon?: React.ReactNode;
				disabled?: boolean;
		  }
		| { divider: true }
	>;
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "filled";
	fullWidth?: boolean;
	/** Menu alignment against the trigger */
	align?: "start" | "end";
	disabled?: boolean;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	/** Submits through a hidden input when set, so a native <form> and FormData see it */
	name?: string;
	/** Blocks native submission while empty; also sets aria-required */
	required?: boolean;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the combobox trigger, so it can be focused */
	ref?: React.Ref<HTMLButtonElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];
/** An option after norm(): a divider, or an item (string options become { value, label }) */
type DropdownItem =
	| {
			value: string;
			label: React.ReactNode;
			description?: React.ReactNode;
			icon?: React.ReactNode;
			disabled?: boolean;
			divider?: undefined;
	  }
	| {
			divider: true;
			value?: undefined;
			label?: undefined;
			description?: undefined;
			icon?: undefined;
			disabled?: undefined;
	  };
type DropdownOption = Exclude<DropdownItem, { divider: true }>;
const norm = (o: DropdownProps["options"][number]): DropdownItem =>
	typeof o === "string" ? { value: o, label: o } : o;
const text = (o: DropdownItem) =>
	typeof o.label === "string" || typeof o.label === "number"
		? String(o.label)
		: String(o.value ?? "");

export function Dropdown({
	label,
	options = [],
	value,
	defaultValue,
	onChange,
	placeholder = "Select",
	size = "md",
	variant = "default",
	fullWidth = false,
	align = "start",
	disabled = false,
	helperText,
	error,
	name,
	required,
	form,
	ref: forwardedRef,
	className,
	style,
}: DropdownProps) {
	const [open, setOpen] = React.useState(false);
	const [inner, setInner] = React.useState(defaultValue);
	const [active, setActive] = React.useState(-1);
	const ref = React.useRef<HTMLDivElement>(null);
	const trigger = React.useRef<HTMLButtonElement>(null);
	const triggerRef = useMergedRef(trigger, forwardedRef);
	const typed = React.useRef({ s: "", t: 0 });
	const uid = React.useId();
	const listId = `${uid}list`,
		labelId = `${uid}label`,
		hintId = `${uid}hint`;
	const optId = React.useCallback((i: number) => `${uid}opt${i}`, [uid]);
	const presence = usePresence(open);
	const cur = value ?? inner;
	const opts = options.map(norm);
	const sel = opts.find((o) => !o.divider && o.value === cur);
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
	const pick = (o: DropdownOption) => {
		if (o.disabled) return;
		setInner(o.value);
		onChange?.(o.value);
		setOpen(false);
	};
	const en = () => opts.map((o, i) => (!o.divider && !o.disabled ? i : -1)).filter((i) => i >= 0);
	const show = (to?: number) => {
		const sel = en();
		const s = opts.findIndex((o) => !o.divider && !o.disabled && o.value === cur);
		setActive(to ?? (s >= 0 ? s : (sel[0] ?? -1)));
		setOpen(true);
	};
	// Type-ahead: printable keys jump to the next option whose label starts with what was typed.
	const ahead = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
		const now = Date.now(),
			t = typed.current;
		t.s = now - t.t > 500 ? e.key.toLowerCase() : t.s + e.key.toLowerCase();
		t.t = now;
		const sel = en(),
			from = Math.max(0, sel.indexOf(active) + (t.s.length === 1 ? 1 : 0));
		const hit = [...sel.slice(from), ...sel.slice(0, from)].find((i) =>
			text(opts[i]!).toLowerCase().startsWith(t.s),
		);
		if (hit == null) return;
		e.preventDefault();
		if (open) setActive(hit);
		else show(hit);
	};
	const key = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		const sel = en(),
			k = e.key;
		if (!open) {
			if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
				e.preventDefault();
				show();
			} else if (k === "Home" || k === "End") {
				e.preventDefault();
				show(k === "Home" ? sel[0] : sel[sel.length - 1]);
			} else ahead(e);
			return;
		}
		if (k === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			setOpen(false);
		} else if (k === "Tab") setOpen(false);
		else if (k === "ArrowDown" || k === "ArrowUp") {
			e.preventDefault();
			const p = sel.indexOf(active);
			const n = k === "ArrowDown" ? sel[Math.min(sel.length - 1, p + 1)] : sel[Math.max(0, p - 1)];
			setActive((n ?? sel[0])!);
		} else if (k === "Home" || k === "End") {
			e.preventDefault();
			setActive((k === "Home" ? sel[0] : sel[sel.length - 1])!);
		} else if (k === "Enter" || (k === " " && Date.now() - typed.current.t > 500)) {
			e.preventDefault();
			if (active >= 0) pick(opts[active] as DropdownOption);
			else setOpen(false);
		} else ahead(e);
	};
	const cls = [
		"q-dropdown",
		`q-dropdown--${SIZES.includes(size) ? size : "md"}`,
		variant === "filled" && "q-dropdown--filled",
		fullWidth && "q-dropdown--full",
		error && "q-dropdown--invalid",
		disabled && "q-dropdown--disabled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div ref={ref} className={cls} style={style}>
			{label && (
				<span id={labelId} className="q-dropdown__label">
					{label}
				</span>
			)}
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				role="combobox"
				aria-required={required || undefined}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={presence.mounted || open ? listId : undefined}
				aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
				aria-labelledby={label ? labelId : undefined}
				aria-label={label ? undefined : placeholder}
				aria-describedby={error || helperText ? hintId : undefined}
				aria-invalid={error ? true : undefined}
				onClick={() => (open ? setOpen(false) : show())}
				onKeyDown={key}
				className={`q-dropdown__trigger${sel ? "" : " q-dropdown__trigger--placeholder"}`}
			>
				{sel?.icon && <span className="q-dropdown__icon">{sel.icon}</span>}
				<span className="q-dropdown__value">{sel ? sel.label : placeholder}</span>
				<span aria-hidden="true" className="q-dropdown__chevron">
					{"\u2193"}
				</span>
			</button>
			{(open || presence.mounted) && (
				<div
					id={listId}
					role="listbox"
					aria-labelledby={label ? labelId : undefined}
					className={`q-dropdown__list q-anim-drop${align === "end" ? " q-dropdown__list--end" : ""}`}
					data-state={open ? "open" : presence.state}
					onMouseDown={(e) => e.preventDefault()}
				>
					{opts.map((o, i) =>
						o.divider ? (
							<div key={`d${i}`} className="q-dropdown__divider" />
						) : (
							<div
								key={o.value}
								id={optId(i)}
								role="option"
								aria-selected={o.value === cur}
								aria-disabled={o.disabled || undefined}
								data-active={active === i || undefined}
								onMouseEnter={() => setActive(i)}
								onClick={() => pick(o)}
								className="q-dropdown__option"
							>
								{o.icon && <span className="q-dropdown__option-icon">{o.icon}</span>}
								<span className="q-dropdown__option-text">
									<span>{o.label}</span>
									{o.description && (
										<span className="q-dropdown__option-description">{o.description}</span>
									)}
								</span>
								<span aria-hidden="true" className="q-dropdown__check">
									{o.value === cur ? "\u2713" : ""}
								</span>
							</div>
						),
					)}
				</div>
			)}
			{(error || helperText) && (
				<span id={hintId} className={`q-dropdown__hint${error ? " q-dropdown__hint--error" : ""}`}>
					{error || helperText}
				</span>
			)}
			<FormValue
				name={name}
				value={cur ?? ""}
				required={required}
				disabled={disabled}
				form={form}
				focusTarget={() => trigger.current}
			/>
		</div>
	);
}
