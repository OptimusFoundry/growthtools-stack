import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Skeleton.module.scss";

export type SkeletonVariant = "text" | "circular" | "rectangular" | "rounded";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Shape variant */
	variant?: SkeletonVariant;
	/** Width (CSS value) */
	width?: string | number;
	/** Height (CSS value) */
	height?: string | number;
	/** Disable animation */
	disableAnimation?: boolean;
}

/**
 * Skeleton component for placeholder loading states.
 *
 * @example
 * ```tsx
 * <Skeleton variant="text" />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" width={200} height={120} />
 * ```
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
	(
		{
			variant = "text",
			width,
			height,
			disableAnimation = false,
			className,
			style,
			...props
		},
		ref,
	) => {
		const skeletonClasses = cn(
			styles.skeleton,
			styles[variant],
			disableAnimation && styles.noAnimation,
			className,
		);

		const inlineStyles: React.CSSProperties = {
			...style,
			...(width !== undefined && {
				width: typeof width === "number" ? `${width}px` : width,
			}),
			...(height !== undefined && {
				height: typeof height === "number" ? `${height}px` : height,
			}),
		};

		return (
			<div
				ref={ref}
				className={skeletonClasses}
				style={inlineStyles}
				aria-hidden="true"
				{...props}
			/>
		);
	},
);

Skeleton.displayName = "Skeleton";
