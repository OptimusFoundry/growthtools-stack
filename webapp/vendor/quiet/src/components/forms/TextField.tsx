import React from "react";
import { FormHint } from "./FormHint";
import { Label } from "./Label";
import "./TextField.scss";

/**
 * Labelled text input — icons, filled variant, sizes, hint and error. The full-featured Input.
 * @startingPoint section="Forms" subtitle="Labelled input with icons" viewport="600x260"
 */
export interface TextFieldProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"size" | "value" | "defaultValue" | "onChange" | "className" | "style"
	> {
	label?: React.ReactNode;
	/** Keep label for screen readers only */
	hideLabel?: boolean;
	required?: boolean;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	leftIcon?: React.ReactNode;
	/** Can be interactive, e.g. a show/hide toggle */
	rightIcon?: React.ReactNode;
	variant?: "default" | "filled";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	id?: string;
	type?: string;
	value?: string;
	defaultValue?: string;
	placeholder?: string;
	onChange?: React.ChangeEventHandler<HTMLInputElement>;
	/** Merged onto the native control (it is passed through with the other input props) */
	className?: string;
	style?: React.CSSProperties;
	inputStyle?: React.CSSProperties;
	/** Reaches the native <input> */
	ref?: React.Ref<HTMLInputElement>;
}

const SIZES = ["sm", "md", "lg"];
let ofTfId = 0;

export function TextField({
	label,
	hideLabel = false,
	required,
	helperText,
	error,
	leftIcon,
	rightIcon,
	variant = "default",
	size = "md",
	disabled,
	id,
	className,
	style,
	inputStyle,
	...rest
}: TextFieldProps) {
	const [auto] = React.useState(() => `of-tf-${++ofTfId}`);
	const fid = id || auto;
	const cls = [
		"q-text-field",
		`q-text-field--${SIZES.includes(size) ? size : "md"}`,
		variant === "filled" && "q-text-field--filled",
		error && "q-text-field--invalid",
		disabled && "q-text-field--disabled",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div className={cls} style={style}>
			{label && (
				<Label
					htmlFor={fid}
					required={required}
					size={size}
					className={hideLabel ? "q-sr-only" : undefined}
				>
					{label}
				</Label>
			)}
			<div className="q-text-field__field">
				{leftIcon && (
					<span aria-hidden="true" className="q-text-field__icon">
						{leftIcon}
					</span>
				)}
				<input
					id={fid}
					disabled={disabled}
					required={required}
					aria-invalid={!!error || undefined}
					aria-describedby={error || helperText ? `${fid}-hint` : undefined}
					{...rest}
					className={["q-text-field__input", className].filter(Boolean).join(" ")}
					style={inputStyle}
				/>
				{rightIcon && <span className="q-text-field__icon">{rightIcon}</span>}
			</div>
			<FormHint id={`${fid}-hint`} variant={error ? "error" : "default"}>
				{error || helperText}
			</FormHint>
		</div>
	);
}
