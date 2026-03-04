import { ChevronDown } from "lucide-react";
import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Select.module.scss";

export type SelectSize = "sm" | "md" | "lg";
export type SelectVariant = "default" | "filled";

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface SelectProps
	extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
	/** Select options */
	options: SelectOption[];
	/** Placeholder text when no value selected */
	placeholder?: string;
	/** Label text */
	label?: string;
	/** Helper text below select */
	helperText?: string;
	/** Error message */
	errorMessage?: string;
	/** Size variant */
	size?: SelectSize;
	/** Visual variant */
	variant?: SelectVariant;
	/** Full width */
	fullWidth?: boolean;
}

/**
 * Select component for choosing from a list of options.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Country"
 *   options={[
 *     { value: "us", label: "United States" },
 *     { value: "uk", label: "United Kingdom" },
 *   ]}
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			options,
			placeholder,
			label,
			helperText,
			errorMessage,
			size = "md",
			variant = "default",
			fullWidth = false,
			id: providedId,
			className,
			disabled,
			...props
		},
		ref,
	) => {
		const generatedId = useId();
		const id = providedId || generatedId;
		const helperId = `${id}-helper`;
		const errorId = `${id}-error`;
		const hasError = !!errorMessage;

		return (
			<div
				className={cn(
					styles.container,
					fullWidth && styles.fullWidth,
					className,
				)}
			>
				{label && (
					<label
						htmlFor={id}
						className={cn(styles.label, styles[`label-${size}`])}
					>
						{label}
					</label>
				)}
				<div
					className={cn(
						styles.wrapper,
						styles[`size-${size}`],
						styles[variant],
						hasError && styles.error,
						disabled && styles.disabled,
						fullWidth && styles.fullWidth,
					)}
				>
					<select
						ref={ref}
						id={id}
						disabled={disabled}
						className={styles.select}
						aria-invalid={hasError}
						aria-describedby={
							hasError ? errorId : helperText ? helperId : undefined
						}
						{...props}
					>
						{placeholder && (
							<option value="" disabled>
								{placeholder}
							</option>
						)}
						{options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</option>
						))}
					</select>
					<div className={styles.icon} aria-hidden="true">
						<ChevronDown />
					</div>
				</div>
				{hasError ? (
					<p id={errorId} className={styles.errorText}>
						{errorMessage}
					</p>
				) : helperText ? (
					<p id={helperId} className={styles.helperText}>
						{helperText}
					</p>
				) : null}
			</div>
		);
	},
);

Select.displayName = "Select";
