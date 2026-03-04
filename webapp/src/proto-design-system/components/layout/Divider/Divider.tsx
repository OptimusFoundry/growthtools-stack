import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Divider.module.scss";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerVariant = "solid" | "dashed" | "dotted";

export interface DividerProps {
	/** Orientation */
	orientation?: DividerOrientation;
	/** Line style */
	variant?: DividerVariant;
	/** Label text or content */
	children?: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Divider component for separating content.
 *
 * @example
 * ```tsx
 * <Divider />
 * <Divider orientation="vertical" />
 * <Divider>OR</Divider>
 * ```
 */
export function Divider({
	orientation = "horizontal",
	variant = "solid",
	children,
	className,
}: DividerProps) {
	const hasLabel = !!children;

	// Use semantic <hr> for simple horizontal dividers
	if (!hasLabel && orientation === "horizontal") {
		return (
			<hr
				className={cn(
					styles.divider,
					styles[orientation],
					styles[variant],
					className,
				)}
				aria-orientation={orientation}
			/>
		);
	}

	// Use div for vertical dividers or dividers with labels
	return (
		<div
			className={cn(
				styles.divider,
				styles[orientation],
				styles[variant],
				hasLabel && styles.withLabel,
				className,
			)}
		>
			{hasLabel && <span className={styles.label}>{children}</span>}
		</div>
	);
}

Divider.displayName = "Divider";
