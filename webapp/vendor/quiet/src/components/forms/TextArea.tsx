import React from "react";
import { FormHint } from "./FormHint";
import { Label } from "./Label";
import "./TextArea.scss";

/**
 * Labelled multi-line input with resize control and optional counter.
 * @startingPoint section="Forms" subtitle="Multi-line input" viewport="600x280"
 */
export interface TextAreaProps
	extends Omit<
		React.TextareaHTMLAttributes<HTMLTextAreaElement>,
		"value" | "defaultValue" | "onChange" | "className" | "style"
	> {
	label?: React.ReactNode;
	/** Keep label for screen readers only */
	hideLabel?: boolean;
	required?: boolean;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	size?: "sm" | "md" | "lg";
	rows?: number;
	resize?: "none" | "vertical" | "both";
	/** Shows an n / max counter */
	maxLength?: number;
	disabled?: boolean;
	id?: string;
	value?: string;
	defaultValue?: string;
	placeholder?: string;
	onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
	/** Merged onto the native control (it is passed through with the other input props) */
	className?: string;
	style?: React.CSSProperties;
	/** Reaches the native <textarea> */
	ref?: React.Ref<HTMLTextAreaElement>;
}

const SIZES = ["sm", "md", "lg"];
let ofTaId = 0;

export function TextArea({
	label,
	hideLabel = false,
	required,
	helperText,
	error,
	size = "md",
	rows = 4,
	resize = "vertical",
	maxLength,
	disabled,
	id,
	className,
	style,
	...rest
}: TextAreaProps) {
	const [len, setLen] = React.useState((rest.value ?? rest.defaultValue ?? "").length);
	const [auto] = React.useState(() => `of-ta-${++ofTaId}`);
	const fid = id || auto;
	const cls = [
		"q-text-area",
		`q-text-area--${SIZES.includes(size) ? size : "md"}`,
		disabled && "q-text-area--disabled",
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
			<textarea
				id={fid}
				rows={rows}
				disabled={disabled}
				required={required}
				maxLength={maxLength}
				aria-invalid={!!error || undefined}
				aria-describedby={
					[(error || helperText) && `${fid}-hint`, maxLength && `${fid}-count`]
						.filter(Boolean)
						.join(" ") || undefined
				}
				{...rest}
				onChange={(e) => {
					setLen(e.target.value.length);
					rest.onChange?.(e);
				}}
				className={["q-text-area__input", error && "q-text-area__input--invalid", className]
					.filter(Boolean)
					.join(" ")}
				style={{ "--_resize": resize } as React.CSSProperties}
			/>
			{(error || helperText || maxLength) && (
				<div className="q-text-area__footer">
					<FormHint id={`${fid}-hint`} variant={error ? "error" : "default"}>
						{error || helperText}
					</FormHint>
					{maxLength && (
						<span id={`${fid}-count`} className="q-text-area__count">
							{len} / {maxLength}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
