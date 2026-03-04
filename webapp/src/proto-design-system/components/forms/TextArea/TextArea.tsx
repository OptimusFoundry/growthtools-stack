import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./TextArea.module.scss";

export type TextAreaSize = "sm" | "md" | "lg";
export type TextAreaResize = "none" | "vertical" | "horizontal" | "both";

export interface TextAreaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	/** Label text */
	label?: string;
	/** Helper text shown below textarea */
	helperText?: string;
	/** Error message (also sets error state) */
	errorMessage?: string;
	/** Size variant */
	size?: TextAreaSize;
	/** Make the field required */
	required?: boolean;
	/** Hide the label visually (still accessible) */
	hideLabel?: boolean;
	/** Error state */
	isError?: boolean;
	/** Resize behavior */
	resize?: TextAreaResize;
	/** Full width */
	fullWidth?: boolean;
}

/**
 * TextArea component for multi-line text input.
 *
 * @example
 * ```tsx
 * <TextArea label="Description" placeholder="Enter description" />
 * <TextArea label="Notes" rows={6} resize="vertical" />
 * ```
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
	(
		{
			label,
			helperText,
			errorMessage,
			size = "md",
			required,
			hideLabel,
			isError,
			resize = "vertical",
			fullWidth,
			id: providedId,
			className,
			disabled,
			rows = 4,
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
			<div
				className={cn(styles.field, fullWidth && styles.fullWidth, className)}
			>
				{label && (
					<label
						htmlFor={id}
						className={cn(styles.label, hideLabel && styles.visuallyHidden)}
					>
						{label}
						{required && <span className={styles.required}>*</span>}
					</label>
				)}

				<textarea
					ref={ref}
					id={id}
					rows={rows}
					disabled={disabled}
					aria-describedby={
						errorMessage ? errorId : helperText ? helperId : undefined
					}
					aria-invalid={hasError}
					aria-required={required}
					className={cn(
						styles.textarea,
						styles[`size-${size}`],
						styles[`resize-${resize}`],
						hasError && styles.error,
						disabled && styles.disabled,
					)}
					{...props}
				/>

				{helperText && !errorMessage && (
					<p id={helperId} className={styles.helper}>
						{helperText}
					</p>
				)}

				{errorMessage && (
					<p id={errorId} className={styles.errorMessage} role="alert">
						{errorMessage}
					</p>
				)}
			</div>
		);
	},
);

TextArea.displayName = "TextArea";
