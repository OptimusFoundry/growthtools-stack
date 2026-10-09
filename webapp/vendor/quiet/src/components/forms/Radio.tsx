import React from "react";
import { FormValue } from "../../a11y/form";
import { rovingKeyDown, useMergedRef } from "../../a11y/hooks";
import "./Radio.scss";

/**
 * Radio group. Options may carry description and disabled.
 * @startingPoint section="Forms" subtitle="Radio groups" viewport="600x220"
 */
export interface RadioProps {
	/** Mono caps group label */
	label?: React.ReactNode;
	options: Array<
		| string
		| { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }
	>;
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	direction?: "row" | "column";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	error?: boolean | string;
	/** Group name when there is no visible label */
	"aria-label"?: string;
	/** Submits through a hidden input when set, so a native <form> and FormData see it */
	name?: string;
	/** Blocks native submission while empty; also sets aria-required */
	required?: boolean;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the radio that holds the tab stop, so it can be focused */
	ref?: React.Ref<HTMLSpanElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];
type RadioOption = Exclude<RadioProps["options"][number], string>;

export function Radio({
	name,
	label,
	"aria-label": ariaLabel,
	options = [],
	value,
	defaultValue,
	onChange,
	direction = "column",
	size = "md",
	disabled = false,
	error,
	required,
	form,
	ref,
	className,
	style,
}: RadioProps) {
	const tabStop = React.useRef<HTMLSpanElement>(null);
	const stopRef = useMergedRef(tabStop, ref);
	const first = options.find((o) => !(o && (o as RadioOption).disabled));
	const [inner, setInner] = React.useState(
		defaultValue ?? (first && ((first as RadioOption).value ?? (first as string))),
	);
	const uid = React.useId();
	const cur = value ?? inner;
	const vals = options.map((o) => (typeof o === "string" ? o : o.value));
	const curOn = options.some(
		(o) =>
			(typeof o === "string" ? o : o.value) === cur &&
			!disabled &&
			!(o && (o as RadioOption).disabled),
	);
	const stop = curOn
		? cur
		: first && !disabled
			? ((first as RadioOption).value ?? (first as string))
			: undefined;
	const cls = ["q-radio", `q-radio--${SIZES.includes(size) ? size : "md"}`, className]
		.filter(Boolean)
		.join(" ");
	return (
		<div
			role="radiogroup"
			aria-label={label ? undefined : ariaLabel}
			aria-labelledby={label ? `${uid}g` : undefined}
			aria-disabled={disabled || undefined}
			aria-required={required || undefined}
			aria-invalid={!!error || undefined}
			aria-describedby={typeof error === "string" ? `${uid}e` : undefined}
			className={cls}
			style={style}
		>
			{label && (
				<div id={`${uid}g`} className="q-radio__label">
					{label}
				</div>
			)}
			<div
				onKeyDown={rovingKeyDown('[role="radio"]', "both", { activate: true })}
				className={`q-radio__options${direction === "row" ? " q-radio__options--row" : ""}`}
				style={
					direction === "row" || direction === "column"
						? undefined
						: ({ "--_direction": direction } as React.CSSProperties)
				}
			>
				{options.map((o, i) => {
					const v = vals[i]!;
					const l = typeof o === "string" ? o : o.label;
					const off = disabled || (o && (o as RadioOption).disabled);
					const on = v === cur;
					const pick = () => {
						if (off) return;
						setInner(v);
						onChange?.(v);
					};
					return (
						<label
							key={v}
							onClick={pick}
							className={`q-radio__option${off ? " q-radio__option--disabled" : ""}`}
						>
							<span
								ref={v === stop ? stopRef : undefined}
								role="radio"
								aria-checked={on}
								aria-labelledby={uid + i}
								aria-describedby={o && (o as RadioOption).description ? `${uid + i}d` : undefined}
								aria-disabled={off || undefined}
								tabIndex={v === stop ? 0 : -1}
								onKeyDown={(e) => e.key === " " && (e.preventDefault(), pick())}
								className="q-radio__control"
							>
								<span className="q-radio__dot" />
							</span>
							<span className="q-radio__text">
								<span id={uid + i}>{l}</span>
								{o && (o as RadioOption).description && (
									<span id={`${uid + i}d`} className="q-radio__description">
										{(o as RadioOption).description}
									</span>
								)}
							</span>
						</label>
					);
				})}
			</div>
			{typeof error === "string" && (
				<span id={`${uid}e`} className="q-radio__error">
					{error}
				</span>
			)}
			<FormValue
				name={name}
				value={cur}
				required={required}
				disabled={disabled}
				form={form}
				focusTarget={() => tabStop.current}
			/>
		</div>
	);
}
