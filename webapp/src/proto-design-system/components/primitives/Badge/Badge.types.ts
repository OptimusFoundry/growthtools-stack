import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant =
	| "default"
	| "primary"
	| "secondary"
	| "success"
	| "warning"
	| "error"
	| "outline";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	/** Visual style variant */
	variant?: BadgeVariant;
	/** Size of the badge */
	size?: BadgeSize;
	/** Makes the badge rounded (pill shape) */
	rounded?: boolean;
	/** Adds a dot indicator before the content */
	dot?: boolean;
	/** Icon to display before content */
	leftIcon?: ReactNode;
	/** Icon to display after content */
	rightIcon?: ReactNode;
	/** Badge content */
	children?: ReactNode;
}
