import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Input.module.scss";

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "filled";

export interface InputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
	/** Size of the input */
	size?: InputSize;
	/** Visual variant */
	variant?: InputVariant;
	/** Icon or element to display at the start */
	leftElement?: ReactNode;
	/** Icon or element to display at the end */
	rightElement?: ReactNode;
	/** Error state */
	isError?: boolean;
	/** Full width */
	isFullWidth?: boolean;
}

/**
 * Input component for text entry with support for icons and validation states.
 *
 * @example
 * ```tsx
 * <Input placeholder="Enter your name" />
 * <Input leftElement={<Search size="1em" />} placeholder="Search..." />
 * <Input isError placeholder="Invalid input" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			size = "md",
			variant = "default",
			leftElement,
			rightElement,
			isError = false,
			isFullWidth = false,
			className,
			disabled,
			...props
		},
		ref,
	) => {
		const wrapperClasses = cn(
			styles.wrapper,
			styles[`size-${size}`],
			styles[variant],
			isError && styles.error,
			isFullWidth && styles.fullWidth,
			disabled && styles.disabled,
			leftElement && styles.hasLeftElement,
			rightElement && styles.hasRightElement,
			className,
		);

		return (
			<div className={wrapperClasses}>
				{leftElement && (
					<span className={styles.leftElement} aria-hidden="true">
						{leftElement}
					</span>
				)}
				<input
					ref={ref}
					className={styles.input}
					disabled={disabled}
					aria-invalid={isError}
					{...props}
				/>
				{rightElement && (
					<span className={styles.rightElement} aria-hidden="true">
						{rightElement}
					</span>
				)}
			</div>
		);
	},
);

Input.displayName = "Input";
