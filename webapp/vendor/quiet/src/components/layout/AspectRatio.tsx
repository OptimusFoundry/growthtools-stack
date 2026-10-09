import type React from "react";
import "./AspectRatio.scss";

/**
 * Fixed-ratio frame. Covers img/video children; empty = dashed placeholder with a mono label.
 * @startingPoint section="Layout" subtitle="Ratio frames + placeholders" viewport="800x300"
 */
export interface AspectRatioProps {
	/** Preset or width/height number */
	ratio?: "square" | "video" | "portrait" | "wide" | "photo" | number;
	/** Placeholder label when empty, e.g. "Product shot" */
	label?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const PRESETS: Record<string, number> = {
	square: 1,
	video: 16 / 9,
	portrait: 3 / 4,
	wide: 21 / 9,
	photo: 4 / 3,
};

export function AspectRatio({
	ratio = "video",
	label,
	children,
	className,
	style,
}: AspectRatioProps) {
	const preset = typeof ratio === "string" && ratio in PRESETS;
	const r: number = PRESETS[ratio] ?? (ratio as number);
	const cls = [
		"q-aspect-ratio",
		preset && `q-aspect-ratio--${ratio}`,
		!children && "q-aspect-ratio--empty",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div className={cls} style={{ ...(!preset && { "--_ratio": String(r) }), ...style }}>
			{children ? (
				<div className="q-aspect-ratio__media">{children}</div>
			) : (
				<span className="q-aspect-ratio__label">
					{label || `${typeof ratio === "string" ? ratio : ""} · ${Math.round(r * 100) / 100}`}
				</span>
			)}
		</div>
	);
}
