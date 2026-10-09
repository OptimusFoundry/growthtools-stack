import React from "react";
import { FormValue } from "../../a11y/form";
import { useMergedRef } from "../../a11y/hooks";
import "./Switch.scss";

/**
 * Pill switch for immediate settings. Ink when on.
 * @startingPoint section="Forms" subtitle="Pill toggles" viewport="600x200"
 */
export interface SwitchProps {
	label?: React.ReactNode;
	description?: React.ReactNode;
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	size?: "sm" | "md" | "lg";
	/** left = settings-row layout */
	labelPosition?: "left" | "right";
	/** Accessible name when there is no visible label */
	"aria-label"?: string;
	/** Submits through a hidden input when set, so a native <form> and FormData see it */
	name?: string;
	/** Submitted while on; default 'on' */
	value?: string;
	/** Blocks native submission while off; also sets aria-required */
	required?: boolean;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the role="switch" element, so it can be focused */
	ref?: React.Ref<HTMLSpanElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];

export function Switch({
	label,
	description,
	checked,
	defaultChecked = false,
	onChange,
	disabled,
	size = "md",
	labelPosition = "right",
	name,
	value = "on",
	required,
	form,
	ref,
	"aria-label": ariaLabel,
	className,
	style,
}: SwitchProps) {
	const track = React.useRef<HTMLSpanElement>(null);
	const trackRef = useMergedRef(track, ref);
	const [inner, setInner] = React.useState(defaultChecked);
	const uid = React.useId();
	const on = checked ?? inner;
	const toggle = () => {
		if (disabled) return;
		setInner(!on);
		onChange?.(!on);
	};
	const text = (label || description) && (
		<span onClick={toggle} className="q-switch__text">
			{label && <span id={`${uid}l`}>{label}</span>}
			{description && (
				<span id={`${uid}d`} className="q-switch__description">
					{description}
				</span>
			)}
		</span>
	);
	const cls = [
		"q-switch",
		`q-switch--${SIZES.includes(size) ? size : "md"}`,
		description && "q-switch--described",
		labelPosition === "left" && "q-switch--label-left",
		disabled && "q-switch--disabled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<label className={cls} style={style}>
			{labelPosition === "left" && text}
			<span
				ref={trackRef}
				role="switch"
				aria-checked={on}
				aria-required={required || undefined}
				aria-labelledby={label ? `${uid}l` : undefined}
				aria-label={label ? undefined : ariaLabel}
				aria-describedby={description ? `${uid}d` : undefined}
				aria-disabled={disabled || undefined}
				tabIndex={disabled ? -1 : 0}
				onClick={toggle}
				onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle())}
				className="q-switch__track"
			>
				<span className="q-switch__thumb" />
			</span>
			{labelPosition !== "left" && text}
			<FormValue
				name={name}
				value={value}
				checked={on}
				required={required}
				disabled={disabled}
				form={form}
				focusTarget={() => track.current}
			/>
		</label>
	);
}
