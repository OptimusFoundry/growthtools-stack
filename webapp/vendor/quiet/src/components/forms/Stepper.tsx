import React from "react";
import { motionToken } from "../../a11y/hooks";
import "./Stepper.scss";

/**
 * Numeric stepper − value +. Pill-shaped hairline box.
 * @startingPoint section="Forms" subtitle="Number stepper" viewport="500x140"
 */
export interface StepperProps {
	value?: number;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	onChange?: (value: number) => void;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	/** Accessible name */
	label?: string;
	/** Id for the value field (spinbutton); FormField sets it so its Label points here */
	id?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean;
	"aria-required"?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];

function StepBtn({
	children,
	onClick,
	disabled,
	off,
	label,
}: {
	children: React.ReactNode;
	onClick: () => void;
	disabled: boolean;
	off: boolean;
	label: string;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={off ? undefined : onClick}
			disabled={disabled}
			aria-disabled={off || undefined}
			tabIndex={-1}
			className="q-stepper__button"
		>
			{children}
		</button>
	);
}

export function Stepper({
	value,
	defaultValue,
	min = -Infinity,
	max = Infinity,
	step = 1,
	onChange,
	size = "md",
	disabled = false,
	label,
	id,
	"aria-describedby": describedBy,
	"aria-invalid": invalid,
	"aria-required": required,
	className,
	style,
}: StepperProps) {
	const [inner, setInner] = React.useState(defaultValue ?? (Number.isFinite(min) ? min : 0));
	const [said, setSaid] = React.useState("");
	const field = React.useRef<HTMLInputElement>(null);
	const cur = value ?? inner;
	const set = (v: number) => {
		const n = Math.min(max, Math.max(min, v));
		setInner(n);
		onChange?.(n);
		return n;
	};
	const nudge = (v: number, say?: boolean) => {
		const n = set(v);
		if (say) setSaid(String(n));
		const el = field.current;
		if (el?.animate && n !== cur && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
			el.animate([{ opacity: 0.35 }, { opacity: 1 }], {
				duration: motionToken(el, "--q-dur-enter"),
				easing: motionToken(el, "--q-ease-soft") as string,
			});
	};
	const key = (e: React.KeyboardEvent<HTMLInputElement>) => {
		const to = (
			{
				ArrowUp: cur + step,
				ArrowDown: cur - step,
				PageUp: cur + step * 10,
				PageDown: cur - step * 10,
				Home: Number.isFinite(min) ? min : null,
				End: Number.isFinite(max) ? max : null,
			} as Record<string, number | null>
		)[e.key];
		if (to === undefined || to === null) return;
		e.preventDefault();
		nudge(to);
	};
	const cls = [
		"q-stepper",
		`q-stepper--${SIZES.includes(size) ? size : "md"}`,
		disabled && "q-stepper--disabled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div role="group" aria-label={label} className={cls} style={style}>
			<StepBtn
				label={label ? `Decrease ${label}` : "Decrease"}
				disabled={disabled}
				off={disabled || cur - step < min}
				onClick={() => nudge(cur - step, true)}
			>
				{"\u2212"}
			</StepBtn>
			{/* --_chars sizes the field to its value (min 40px) */}
			<input
				ref={field}
				id={id}
				type="text"
				inputMode="numeric"
				role="spinbutton"
				aria-label={label}
				value={cur}
				disabled={disabled}
				aria-valuenow={cur}
				aria-valuemin={Number.isFinite(min) ? min : undefined}
				aria-valuemax={Number.isFinite(max) ? max : undefined}
				aria-describedby={describedBy}
				aria-invalid={invalid}
				aria-required={required}
				onKeyDown={key}
				onChange={(e) => {
					const n = parseFloat(e.target.value);
					if (!Number.isNaN(n)) set(n);
				}}
				className="q-stepper__field"
				style={{ "--_chars": String(cur).length } as React.CSSProperties}
			/>
			<StepBtn
				label={label ? `Increase ${label}` : "Increase"}
				disabled={disabled}
				off={disabled || cur + step > max}
				onClick={() => nudge(cur + step, true)}
			>
				+
			</StepBtn>
			<span className="q-sr-only" aria-live="polite">
				{said}
			</span>
		</div>
	);
}
/** FormField wires id / aria-* into controls that set this */
Stepper.fieldControl = true;
