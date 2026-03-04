import { Check, Minus } from "lucide-react";
import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Checkbox.module.scss";

export type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"size" | "type" | "onKeyDown"
	> {
	/** Label text */
	label?: string;
	/** Description text below label */
	description?: string;
	/** Size variant */
	size?: CheckboxSize;
	/** Indeterminate state */
	indeterminate?: boolean;
	/** Error state */
	isError?: boolean;
}

/**
 * Checkbox component for boolean selection.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms" />
 * <Checkbox label="Subscribe" description="Get weekly updates" />
 * <Checkbox indeterminate />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
	(
		{
			label,
			description,
			size = "md",
			indeterminate = false,
			isError,
			id: providedId,
			className,
			disabled,
			...props
		},
		ref,
	) => {
		const generatedId = useId();
		const id = providedId || generatedId;
		const descriptionId = description ? `${id}-description` : undefined;

		return (
			<div
				className={cn(styles.container, disabled && styles.disabled, className)}
			>
				<div className={styles.checkboxWrapper}>
					<input
						ref={(node) => {
							if (node) {
								node.indeterminate = indeterminate;
							}
							if (typeof ref === "function") {
								ref(node);
							} else if (ref) {
								ref.current = node;
							}
						}}
						type="checkbox"
						id={id}
						disabled={disabled}
						aria-describedby={descriptionId}
						className={cn(
							styles.input,
							styles[`size-${size}`],
							isError && styles.error,
						)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.currentTarget.click();
							}
						}}
						{...props}
					/>
					<div
						className={cn(styles.checkbox, styles[`size-${size}`])}
						aria-hidden="true"
					>
						{indeterminate ? (
							<Minus className={styles.icon} />
						) : (
							<Check className={styles.icon} />
						)}
					</div>
				</div>

				{(label || description) && (
					<div className={styles.content}>
						{label && (
							<label
								htmlFor={id}
								className={cn(styles.label, styles[`label-${size}`])}
							>
								{label}
							</label>
						)}
						{description && (
							<p id={descriptionId} className={styles.description}>
								{description}
							</p>
						)}
					</div>
				)}
			</div>
		);
	},
);

Checkbox.displayName = "Checkbox";
