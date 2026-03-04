import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Slider.module.scss";

export type SliderSize = "sm" | "md" | "lg";

export interface SliderProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
	/** Label text */
	label?: string;
	/** Show current value */
	showValue?: boolean;
	/** Format the displayed value */
	formatValue?: (value: number) => string;
	/** Size variant */
	size?: SliderSize;
	/** Full width */
	fullWidth?: boolean;
}

/**
 * Slider component for selecting a value from a range.
 *
 * @example
 * ```tsx
 * <Slider label="Volume" min={0} max={100} defaultValue={50} />
 * <Slider label="Price" min={0} max={1000} showValue formatValue={(v) => `$${v}`} />
 * ```
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(
	(
		{
			label,
			showValue = false,
			formatValue = (v) => String(v),
			size = "md",
			fullWidth = false,
			id: providedId,
			className,
			disabled,
			min = 0,
			max = 100,
			defaultValue,
			value,
			...props
		},
		ref,
	) => {
		const generatedId = useId();
		const id = providedId || generatedId;
		const displayValue = value ?? defaultValue ?? min;

		return (
			<div
				className={cn(
					styles.container,
					fullWidth && styles.fullWidth,
					disabled && styles.disabled,
					className,
				)}
			>
				{(label || showValue) && (
					<div className={styles.header}>
						{label && (
							<label
								htmlFor={id}
								className={cn(styles.label, styles[`label-${size}`])}
							>
								{label}
							</label>
						)}
						{showValue && (
							<span className={cn(styles.value, styles[`value-${size}`])}>
								{formatValue(Number(displayValue))}
							</span>
						)}
					</div>
				)}
				<input
					ref={ref}
					type="range"
					id={id}
					disabled={disabled}
					min={min}
					max={max}
					defaultValue={defaultValue}
					value={value}
					className={cn(styles.slider, styles[`size-${size}`])}
					{...props}
				/>
			</div>
		);
	},
);

Slider.displayName = "Slider";
