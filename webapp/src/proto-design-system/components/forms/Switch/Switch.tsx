import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Switch.module.scss";

export type SwitchSize = "sm" | "md" | "lg";

export interface SwitchProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"size" | "type" | "onKeyDown"
	> {
	/** Label text */
	label?: string;
	/** Description text below label */
	description?: string;
	/** Size variant */
	size?: SwitchSize;
	/** Position label on the left */
	labelPosition?: "left" | "right";
}

/**
 * Switch component for toggling between on/off states.
 *
 * @example
 * ```tsx
 * <Switch label="Dark mode" />
 * <Switch label="Notifications" description="Receive push notifications" />
 * ```
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
	(
		{
			label,
			description,
			size = "md",
			labelPosition = "right",
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

		const switchElement = (
			<div className={styles.switchWrapper}>
				<input
					ref={ref}
					type="checkbox"
					id={id}
					disabled={disabled}
					aria-describedby={descriptionId}
					className={cn(styles.input, styles[`size-${size}`])}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.currentTarget.click();
						}
					}}
					{...props}
				/>
				<div
					className={cn(styles.track, styles[`size-${size}`])}
					aria-hidden="true"
				>
					<div className={styles.thumb} />
				</div>
			</div>
		);

		const labelElement = (label || description) && (
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
		);

		return (
			<div
				className={cn(styles.container, disabled && styles.disabled, className)}
			>
				{labelPosition === "left" && labelElement}
				{switchElement}
				{labelPosition === "right" && labelElement}
			</div>
		);
	},
);

Switch.displayName = "Switch";
