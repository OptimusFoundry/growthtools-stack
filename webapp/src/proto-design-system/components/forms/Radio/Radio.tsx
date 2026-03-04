import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Radio.module.scss";

export type RadioSize = "sm" | "md" | "lg";

export interface RadioProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"size" | "type" | "onKeyDown"
	> {
	/** Label text */
	label?: string;
	/** Description text below label */
	description?: string;
	/** Size variant */
	size?: RadioSize;
	/** Error state */
	isError?: boolean;
}

/**
 * Radio component for single selection from a group.
 *
 * @example
 * ```tsx
 * <Radio name="plan" value="free" label="Free plan" />
 * <Radio name="plan" value="pro" label="Pro plan" description="$9/month" />
 * ```
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
	(
		{
			label,
			description,
			size = "md",
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
				<div className={styles.radioWrapper}>
					<input
						ref={ref}
						type="radio"
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
						className={cn(styles.radio, styles[`size-${size}`])}
						aria-hidden="true"
					>
						<div className={styles.dot} />
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

Radio.displayName = "Radio";
