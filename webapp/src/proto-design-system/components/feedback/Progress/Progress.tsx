import { cn } from "../../../utils/cn";
import styles from "./Progress.module.scss";

export type ProgressSize = "sm" | "md" | "lg";
export type ProgressVariant = "default" | "success" | "warning" | "error";

export interface ProgressProps {
	/** Current progress value (0-100) */
	value: number;
	/** Maximum value */
	max?: number;
	/** Size variant */
	size?: ProgressSize;
	/** Color variant */
	variant?: ProgressVariant;
	/** Show percentage label */
	showLabel?: boolean;
	/** Indeterminate loading state */
	indeterminate?: boolean;
	/** Accessible label */
	"aria-label"?: string;
	/** Additional className */
	className?: string;
}

/**
 * Progress component for showing completion status.
 *
 * @example
 * ```tsx
 * <Progress value={75} />
 * <Progress value={50} showLabel />
 * <Progress indeterminate />
 * ```
 */
export function Progress({
	value,
	max = 100,
	size = "md",
	variant = "default",
	showLabel = false,
	indeterminate = false,
	"aria-label": ariaLabel,
	className,
}: ProgressProps) {
	const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

	return (
		<div className={cn(styles.container, className)}>
			<progress
				className={styles.srOnly}
				value={indeterminate ? undefined : value}
				max={max}
				aria-label={ariaLabel || `Progress: ${Math.round(percentage)}%`}
			/>
			<div className={cn(styles.track, styles[`size-${size}`])}>
				<div
					className={cn(
						styles.bar,
						styles[variant],
						indeterminate && styles.indeterminate,
					)}
					style={indeterminate ? undefined : { width: `${percentage}%` }}
				/>
			</div>
			{showLabel && !indeterminate && (
				<span className={cn(styles.label, styles[`label-${size}`])}>
					{Math.round(percentage)}%
				</span>
			)}
		</div>
	);
}

Progress.displayName = "Progress";
