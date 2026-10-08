import React from "react";
import "./Progress.scss";

/**
 * Hairline progress bar. Ink by default; molten only for heat (process rail), warning, error.
 * @startingPoint section="Feedback" subtitle="Hairline progress" viewport="600x260"
 */
export interface ProgressProps {
	value?: number;
	max?: number;
	/** 1px · 2px · 4px */
	size?: "sm" | "md" | "lg";
	variant?: "default" | "success" | "warning" | "error" | "heat";
	indeterminate?: boolean;
	label?: React.ReactNode;
	showValue?: boolean;
	/** Accessible name when there is no label; defaults to "Progress" */
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: string[] = ["sm", "md", "lg"];
const VARIANTS: string[] = ["success", "warning", "error", "heat"];

export function Progress({
	value = 0,
	max = 100,
	size = "md",
	variant = "default",
	indeterminate = false,
	label,
	showValue = false,
	"aria-label": ariaLabel,
	className,
	style,
}: ProgressProps) {
	const id = React.useId();
	const pct = Math.max(0, Math.min(100, (value / max) * 100));
	const done = !indeterminate && pct >= 100;
	const cls = [
		"q-progress",
		`q-progress--${SIZES.includes(size) ? size : "md"}`,
		VARIANTS.includes(variant) && `q-progress--${variant}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div className={cls} style={style}>
			{(label || showValue) && (
				<div className="q-progress__meta">
					<span id={id}>{label}</span>
					{showValue && !indeterminate && (
						<span className="q-progress__value">
							{done && variant === "success" ? "✓ " : ""}
							{Math.round(pct)}%
						</span>
					)}
				</div>
			)}
			<div
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={max}
				aria-valuenow={indeterminate ? undefined : value}
				aria-labelledby={label && !ariaLabel ? id : undefined}
				aria-label={label && !ariaLabel ? undefined : ariaLabel || "Progress"}
				aria-valuetext={indeterminate ? undefined : `${Math.round(pct)}%`}
				className="q-progress__track"
			>
				{indeterminate ? (
					<span className="q-progress__fill q-progress__fill--indeterminate" />
				) : (
					<span
						className="q-progress__fill"
						style={{ "--_progress": `${pct}%` } as React.CSSProperties}
					/>
				)}
			</div>
		</div>
	);
}
