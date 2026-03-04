import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Spinner.module.scss";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerVariant = "default" | "primary" | "secondary" | "white";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Size of the spinner */
	size?: SpinnerSize;
	/** Color variant */
	variant?: SpinnerVariant;
	/** Accessible label for screen readers */
	label?: string;
}

/**
 * Spinner component for loading states.
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" variant="primary" />
 * <Spinner label="Loading data..." />
 * ```
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
	(
		{
			size = "md",
			variant = "default",
			label = "Loading",
			className,
			...props
		},
		ref,
	) => {
		const spinnerClasses = cn(
			styles.spinner,
			styles[size],
			styles[variant],
			className,
		);

		return (
			<div
				ref={ref}
				role="status"
				aria-label={label}
				className={spinnerClasses}
				{...props}
			>
				<span className={styles.visuallyHidden}>{label}</span>
			</div>
		);
	},
);

Spinner.displayName = "Spinner";
