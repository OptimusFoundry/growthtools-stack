import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./FormField.module.scss";

export type FormFieldSize = "sm" | "md" | "lg";

export interface FormFieldProps {
	/** Label text */
	label?: string;
	/** Helper text below the field */
	helperText?: string;
	/** Error message (replaces helper text when present) */
	errorMessage?: string;
	/** Whether the field is required */
	required?: boolean;
	/** Size variant */
	size?: FormFieldSize;
	/** Field ID for label association */
	id?: string;
	/** Form field content */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * FormField wrapper component for consistent field layout.
 * Provides label, helper text, and error handling.
 *
 * @example
 * ```tsx
 * <FormField label="Email" helperText="We'll never share your email">
 *   <Input type="email" />
 * </FormField>
 * ```
 */
export function FormField({
	label,
	helperText,
	errorMessage,
	required = false,
	size = "md",
	id: providedId,
	children,
	className,
}: FormFieldProps) {
	const generatedId = useId();
	const id = providedId || generatedId;
	const helperId = `${id}-helper`;
	const errorId = `${id}-error`;
	const hasError = !!errorMessage;

	return (
		<div className={cn(styles.container, className)}>
			{label && (
				<label
					htmlFor={id}
					className={cn(styles.label, styles[`label-${size}`])}
				>
					{label}
					{required && <span className={styles.required}>*</span>}
				</label>
			)}
			<div className={styles.field}>{children}</div>
			{hasError ? (
				<p id={errorId} className={styles.errorText} role="alert">
					{errorMessage}
				</p>
			) : helperText ? (
				<p id={helperId} className={styles.helperText}>
					{helperText}
				</p>
			) : null}
		</div>
	);
}

FormField.displayName = "FormField";
