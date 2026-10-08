import React from "react";
import { FormHint } from "./FormHint";
import "./Select.scss";

/** Native select styled with soft --radius-md corners with a ↓ glyph. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
	label?: React.ReactNode;
	options?: Array<string | { value: string; label: string; disabled?: boolean }>;
	/** Disabled first option with value ""; selected until the user picks */
	placeholder?: string;
	helperText?: React.ReactNode;
	/** true = molten edge; a node = edge + message (replaces helperText) */
	error?: boolean | React.ReactNode;
	size?: "sm" | "md" | "lg";
	/** Reaches the native <select> */
	ref?: React.Ref<HTMLSelectElement>;
}

const SIZES = ["sm", "md", "lg"];

export function Select({
	label,
	options = [],
	placeholder,
	helperText,
	error,
	size = "md",
	className,
	style,
	...rest
}: SelectProps) {
	const uid = React.useId();
	const message = error && error !== true ? error : helperText;
	// A disabled placeholder is skipped by the browser's default selection, so start on it explicitly.
	const start =
		placeholder && !rest.multiple && rest.value === undefined && rest.defaultValue === undefined
			? { defaultValue: "" }
			: undefined;
	const cls = [
		"q-select",
		`q-select--${SIZES.includes(size) ? size : "md"}`,
		error && "q-select--invalid",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<label className={cls} style={style}>
			{label && (
				<span id={`${uid}l`} className="q-select__label">
					{label}
				</span>
			)}
			<span className="q-select__control">
				{/* The hint sits inside the wrapping <label>; aria-labelledby keeps it out of the accessible name. */}
				<select
					aria-labelledby={label && message ? `${uid}l` : undefined}
					aria-invalid={error ? true : undefined}
					aria-describedby={message ? `${uid}h` : undefined}
					{...start}
					{...rest}
					className={["q-select__input", className].filter(Boolean).join(" ")}
				>
					{placeholder && (
						<option value="" disabled>
							{placeholder}
						</option>
					)}
					{options.map((o) =>
						typeof o === "string" ? (
							<option key={o} value={o}>
								{o}
							</option>
						) : (
							<option key={o.value} value={o.value} disabled={o.disabled}>
								{o.label}
							</option>
						),
					)}
				</select>
				<span aria-hidden="true" className="q-select__chevron">
					{"↓"}
				</span>
			</span>
			<FormHint id={`${uid}h`} variant={error ? "error" : "default"}>
				{message}
			</FormHint>
		</label>
	);
}
