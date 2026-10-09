import React from "react";
import "./Input.scss";

/**
 * Rounded text field with mono label.
 * @startingPoint section="Forms" subtitle="Text inputs, select, checks, switch" viewport="700x360"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: React.ReactNode;
	hint?: React.ReactNode;
	/** Error text — border and message turn molten */
	error?: React.ReactNode;
	/** Render a textarea */
	multiline?: boolean;
	/** Reaches the native control: the <input>, or the <textarea> when multiline */
	ref?: React.Ref<HTMLInputElement> | React.Ref<HTMLTextAreaElement>;
}

export function Input({
	label,
	hint,
	error,
	multiline = false,
	className,
	style,
	...rest
}: InputProps) {
	const El = multiline ? "textarea" : "input";
	const uid = React.useId();
	const first = React.useRef(error ? "e" : hint ? "h" : "").current;
	const shown = error ? "e" : hint ? "h" : "";
	return (
		<label className="q-input" style={style}>
			{label && <span className="q-input__label">{label}</span>}
			<El
				aria-invalid={!!error || undefined}
				aria-describedby={error || hint ? `${uid}h` : undefined}
				{...(rest as React.InputHTMLAttributes<HTMLInputElement> &
					React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
				className={[
					"q-input__field",
					multiline && "q-input__field--multiline",
					error && "q-input__field--invalid",
					className,
				]
					.filter(Boolean)
					.join(" ")}
			/>
			{(error || hint) && (
				<span
					key={shown}
					id={`${uid}h`}
					className={
						"q-input__hint" +
						(error ? " q-input__hint--error" : "") +
						(shown !== first ? " q-anim-fade" : "")
					}
					data-state="open"
				>
					{error || hint}
				</span>
			)}
		</label>
	);
}
