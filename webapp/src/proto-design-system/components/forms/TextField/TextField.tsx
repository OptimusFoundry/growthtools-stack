import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { Input, type InputProps } from "../Input/Input";
import styles from "./TextField.module.scss";

export interface TextFieldProps extends InputProps {
	/** Label text */
	label?: string;
	/** Helper text shown below input */
	helperText?: string;
	/** Error message (also sets error state) */
	errorMessage?: string;
	/** Make the field required */
	required?: boolean;
	/** Hide the label visually (still accessible) */
	hideLabel?: boolean;
}

/**
 * TextField component - Input with label, helper text, and error handling.
 *
 * @example
 * ```tsx
 * <TextField label="Email" placeholder="Enter email" />
 * <TextField label="Password" type="password" required />
 * <TextField label="Username" errorMessage="Username is taken" />
 * ```
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
	(
		{
			label,
			helperText,
			errorMessage,
			required,
			hideLabel,
			id: providedId,
			className,
			isError,
			...props
		},
		ref,
	) => {
		const generatedId = useId();
		const id = providedId || generatedId;
		const helperId = `${id}-helper`;
		const errorId = `${id}-error`;
		const hasError = isError || !!errorMessage;

		return (
			<div className={cn(styles.field, className)}>
				{label && (
					<label
						htmlFor={id}
						className={cn(styles.label, hideLabel && styles.visuallyHidden)}
					>
						{label}
						{required && <span className={styles.required}>*</span>}
					</label>
				)}

				<Input
					ref={ref}
					id={id}
					isError={hasError}
					aria-describedby={
						errorMessage ? errorId : helperText ? helperId : undefined
					}
					aria-invalid={hasError}
					aria-required={required}
					{...props}
				/>

				{helperText && !errorMessage && (
					<p id={helperId} className={styles.helper}>
						{helperText}
					</p>
				)}

				{errorMessage && (
					<p id={errorId} className={styles.error} role="alert">
						{errorMessage}
					</p>
				)}
			</div>
		);
	},
);

TextField.displayName = "TextField";
