import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./AspectRatio.module.scss";

export type AspectRatioPreset = "square" | "video" | "portrait" | "wide";

export interface AspectRatioProps {
	/** Aspect ratio as width/height (e.g., 16/9) or preset */
	ratio?: number | AspectRatioPreset;
	/** Content to display */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

const presetRatios: Record<AspectRatioPreset, number> = {
	square: 1,
	video: 16 / 9,
	portrait: 3 / 4,
	wide: 21 / 9,
};

/**
 * AspectRatio component for maintaining consistent proportions.
 *
 * @example
 * ```tsx
 * <AspectRatio ratio={16/9}>
 *   <img src="..." alt="..." />
 * </AspectRatio>
 * <AspectRatio ratio="video">
 *   <iframe src="..." />
 * </AspectRatio>
 * ```
 */
export function AspectRatio({
	ratio = "video",
	children,
	className,
}: AspectRatioProps) {
	const numericRatio = typeof ratio === "string" ? presetRatios[ratio] : ratio;
	const paddingBottom = `${(1 / numericRatio) * 100}%`;

	return (
		<div className={cn(styles.container, className)} style={{ paddingBottom }}>
			<div className={styles.content}>{children}</div>
		</div>
	);
}

AspectRatio.displayName = "AspectRatio";
