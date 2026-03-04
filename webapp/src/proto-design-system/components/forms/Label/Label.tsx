import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Label.module.scss";

export type LabelSize = "sm" | "md" | "lg";

export interface LabelProps {
	/** Label text */
	children: ReactNode;
	/** Optional secondary/sub text */
	subText?: string;
	/** Whether the field is required */
	required?: boolean;
	/** Optional badge content */
	badge?: ReactNode;
	/** Optional trailing action (link or button) */
	action?: ReactNode;
	/** Associated input ID */
	htmlFor?: string;
	/** Size variant */
	size?: LabelSize;
	/** Disabled state */
	disabled?: boolean;
	/** Additional className */
	className?: string;
}

/**
 * Label component for form fields.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email" required>Email address</Label>
 * <Label subText="optional" badge={<Badge>New</Badge>}>Username</Label>
 * <Label action={<LinkButton href="/help">Learn more</LinkButton>}>Password</Label>
 * ```
 */
export function Label({
	children,
	subText,
	required = false,
	badge,
	action,
	htmlFor,
	size = "md",
	disabled = false,
	className,
}: LabelProps) {
	return (
		<div
			className={cn(styles.container, disabled && styles.disabled, className)}
		>
			<label
				htmlFor={htmlFor}
				className={cn(styles.label, styles[`size-${size}`])}
			>
				<span className={styles.text}>
					{children}
					{required && <span className={styles.required}>*</span>}
				</span>
				{subText && <span className={styles.subText}>({subText})</span>}
				{badge && <span className={styles.badge}>{badge}</span>}
			</label>
			{action && <span className={styles.action}>{action}</span>}
		</div>
	);
}

Label.displayName = "Label";
