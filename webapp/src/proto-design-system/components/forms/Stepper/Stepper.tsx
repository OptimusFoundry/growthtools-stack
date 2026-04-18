import { Minus, Plus } from "lucide-react";
import { useCallback } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Stepper.module.scss";

export type StepperSize = "sm" | "md" | "lg";

export interface StepperProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	size?: StepperSize;
	disabled?: boolean;
	"aria-label"?: string;
	className?: string;
}

/**
 * Stepper — a numeric input rendered as [−] [value] [+].
 * Value stays clamped within [min, max].
 */
export function Stepper({
	value,
	onChange,
	min = Number.NEGATIVE_INFINITY,
	max = Number.POSITIVE_INFINITY,
	step = 1,
	size = "md",
	disabled = false,
	"aria-label": ariaLabel,
	className,
}: StepperProps) {
	const clamp = useCallback(
		(next: number) => Math.min(max, Math.max(min, next)),
		[min, max],
	);

	const dec = () => onChange(clamp(value - step));
	const inc = () => onChange(clamp(value + step));

	const atMin = value <= min;
	const atMax = value >= max;

	return (
		<div
			className={cn(styles.stepper, styles[`size-${size}`], className)}
			role="group"
			aria-label={ariaLabel}
		>
			<button
				type="button"
				className={styles.btn}
				onClick={dec}
				disabled={disabled || atMin}
				aria-label="Decrement"
			>
				<Minus size={14} aria-hidden />
			</button>
			<span className={styles.value} aria-live="polite">
				{value}
			</span>
			<button
				type="button"
				className={styles.btn}
				onClick={inc}
				disabled={disabled || atMax}
				aria-label="Increment"
			>
				<Plus size={14} aria-hidden />
			</button>
		</div>
	);
}
