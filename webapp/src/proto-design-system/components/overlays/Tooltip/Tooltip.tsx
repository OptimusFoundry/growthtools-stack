import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Tooltip.module.scss";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
	/** Tooltip content */
	content: ReactNode;
	/** Position of tooltip */
	position?: TooltipPosition;
	/** Trigger element */
	children: ReactNode;
	/** Additional className for tooltip */
	className?: string;
}

/**
 * Tooltip component for displaying additional information on hover.
 * Uses CSS-only approach for best performance.
 *
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
	content,
	position = "top",
	children,
	className,
}: TooltipProps) {
	return (
		<span className={styles.wrapper}>
			{children}
			<span
				className={cn(styles.tooltip, styles[position], className)}
				role="tooltip"
			>
				{content}
				<span className={styles.arrow} />
			</span>
		</span>
	);
}

Tooltip.displayName = "Tooltip";
