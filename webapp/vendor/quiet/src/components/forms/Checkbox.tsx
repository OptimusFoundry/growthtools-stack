import React from "react";
import { FormValue } from "../../a11y/form";
import { useMergedRef } from "../../a11y/hooks";
import "./Checkbox.scss";

/**
 * Soft-cornered checkbox (--radius-xs), ink fill with ✓. Indeterminate, description, error, sizes.
 * @startingPoint section="Forms" subtitle="Soft checks" viewport="600x220"
 */
export interface CheckboxProps {
	label?: React.ReactNode;
	description?: React.ReactNode;
	checked?: boolean;
	defaultChecked?: boolean;
	/** Shows − and aria-checked="mixed" */
	indeterminate?: boolean;
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	/** true = molten edge; string = edge + message */
	error?: boolean | string;
	size?: "sm" | "md" | "lg";
	/** Accessible name when there is no visible label */
	"aria-label"?: string;
	/** Submits through a hidden input when set, so a native <form> and FormData see it */
	name?: string;
	/** Submitted while checked; default 'on' */
	value?: string;
	/** Blocks native submission while unchecked; also sets aria-required */
	required?: boolean;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the role="checkbox" element, so it can be focused */
	ref?: React.Ref<HTMLSpanElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];

export function Checkbox({
	label,
	description,
	checked,
	defaultChecked = false,
	indeterminate = false,
	onChange,
	disabled,
	error,
	size = "md",
	name,
	value = "on",
	required,
	form,
	ref,
	"aria-label": ariaLabel,
	className,
	style,
}: CheckboxProps) {
	const box = React.useRef<HTMLSpanElement>(null);
	const boxRef = useMergedRef(box, ref);
	const [inner, setInner] = React.useState(defaultChecked);
	const uid = React.useId();
	const on = checked ?? inner;
	const toggle = () => {
		if (disabled) return;
		setInner(!on);
		onChange?.(!on);
	};
	const described =
		[description && `${uid}d`, typeof error === "string" && `${uid}e`].filter(Boolean).join(" ") ||
		undefined;
	const cls = [
		"q-checkbox",
		`q-checkbox--${SIZES.includes(size) ? size : "md"}`,
		label && "q-checkbox--labelled",
		disabled && "q-checkbox--disabled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<label className={cls} style={style}>
			<span
				ref={boxRef}
				role="checkbox"
				aria-checked={indeterminate ? "mixed" : on}
				aria-required={required || undefined}
				aria-invalid={!!error || undefined}
				aria-labelledby={label ? `${uid}l` : undefined}
				aria-label={label ? undefined : ariaLabel}
				aria-describedby={described}
				aria-disabled={disabled || undefined}
				tabIndex={disabled ? -1 : 0}
				onClick={toggle}
				onKeyDown={(e) => e.key === " " && (e.preventDefault(), toggle())}
				className="q-checkbox__box"
			>
				<span aria-hidden="true" className="q-checkbox__mark">
					{indeterminate ? "\u2212" : "\u2713"}
				</span>
			</span>
			{(label || description || error) && (
				<span onClick={toggle} className="q-checkbox__text">
					{label && <span id={`${uid}l`}>{label}</span>}
					{description && (
						<span id={`${uid}d`} className="q-checkbox__description">
							{description}
						</span>
					)}
					{typeof error === "string" && (
						<span id={`${uid}e`} className="q-checkbox__error">
							{error}
						</span>
					)}
				</span>
			)}
			<FormValue
				name={name}
				value={value}
				checked={on}
				required={required}
				disabled={disabled}
				form={form}
				focusTarget={() => box.current}
			/>
		</label>
	);
}
