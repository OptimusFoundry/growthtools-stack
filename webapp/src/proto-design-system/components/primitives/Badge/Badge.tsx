import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Badge.module.scss";
import type { BadgeProps } from "./Badge.types";

/**
 * Badge component for displaying status, labels, or counts.
 *
 * @example
 * ```tsx
 * <Badge>Default</Badge>
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" dot>Offline</Badge>
 * <Badge variant="primary" rounded>99+</Badge>
 * ```
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
	(
		{
			variant = "default",
			size = "md",
			rounded = false,
			dot = false,
			leftIcon,
			rightIcon,
			children,
			className,
			...props
		},
		ref,
	) => {
		const badgeClasses = cn(
			styles.badge,
			styles[variant],
			styles[size],
			rounded && styles.rounded,
			className,
		);

		return (
			<span ref={ref} className={badgeClasses} {...props}>
				{dot && <span className={styles.dot} aria-hidden="true" />}
				{leftIcon && (
					<span className={styles.icon} aria-hidden="true">
						{leftIcon}
					</span>
				)}
				{children}
				{rightIcon && (
					<span className={styles.icon} aria-hidden="true">
						{rightIcon}
					</span>
				)}
			</span>
		);
	},
);

Badge.displayName = "Badge";
