import React from "react";
import "./Skeleton.scss";

/**
 * Paper-2 loading placeholder with a slow 2s pulse.
 * @startingPoint section="Feedback" subtitle="Loading placeholders" viewport="600x240"
 */
export interface SkeletonProps {
	variant?: "text" | "circular" | "rectangular" | "rounded";
	width?: number | string;
	height?: number | string;
	/** text only: number of lines; last line is 60% */
	lines?: number;
	gap?: number;
	animate?: boolean;
	/** Announces loading: the placeholder becomes role="status" aria-busy with this name instead of aria-hidden */
	label?: string;
	/** false renders children instead; content that replaces a visible skeleton fades in */
	loading?: boolean;
	/** Content shown when loading is false (a single element gets the fade-in) */
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const VARIANTS: string[] = ["text", "circular", "rectangular", "rounded"];
const len = (v: number | string) => (typeof v === "number" ? `${v}px` : v);

export function Skeleton({
	variant = "text",
	width,
	height,
	lines = 1,
	gap,
	animate = true,
	label,
	loading = true,
	children,
	className,
	style,
}: SkeletonProps) {
	// Content that replaces a visible skeleton fades in; content that was never loading just renders.
	const wasLoading = React.useRef(loading);
	if (loading) wasLoading.current = true;
	if (!loading) {
		if (!wasLoading.current || !React.isValidElement(children)) return children ?? null;
		return React.cloneElement(
			children as React.ReactElement<{ className?: string; "data-state"?: string }>,
			{
				className: [
					"q-anim-fade",
					(children as React.ReactElement<{ className?: string }>).props.className,
				]
					.filter(Boolean)
					.join(" "),
				"data-state": "open",
			},
		);
	}
	const a11y: React.HTMLAttributes<HTMLSpanElement> = label
		? { role: "status", "aria-busy": true, "aria-label": label }
		: { "aria-hidden": true };
	const still = !animate && "q-skeleton--still";
	if (variant === "text" && lines > 1) {
		const lineVars =
			height != null ? ({ "--_height": len(height) } as React.CSSProperties) : undefined;
		const groupVars: Record<string, string> = {};
		if (gap != null) groupVars["--_gap"] = len(gap);
		if (width != null) groupVars["--_width"] = len(width);
		return (
			<span
				{...a11y}
				className={["q-skeleton-group", className].filter(Boolean).join(" ")}
				style={{ ...groupVars, ...style }}
			>
				{Array.from({ length: lines }, (_, i) => (
					<span
						key={i}
						className={["q-skeleton", "q-skeleton--text", still].filter(Boolean).join(" ")}
						style={lineVars}
					/>
				))}
			</span>
		);
	}
	const vars: Record<string, string> = {};
	if (width != null) vars["--_width"] = len(width);
	if (height != null) vars["--_height"] = len(height);
	const cls = [
		"q-skeleton",
		VARIANTS.includes(variant) && `q-skeleton--${variant}`,
		still,
		className,
	]
		.filter(Boolean)
		.join(" ");
	return <span {...a11y} className={cls} style={{ ...vars, ...style }} />;
}
