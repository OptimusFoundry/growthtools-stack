import type React from "react";
import "./Eyebrow.scss";

/** Mono section label: "01 The studio". */
export interface EyebrowProps {
	/** Serial number shown in ink before the label, e.g. "01" */
	index?: string;
	tone?: "muted" | "ink";
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function Eyebrow({ index, children, tone = "muted", className, style }: EyebrowProps) {
	return (
		<div
			className={["q-eyebrow", tone === "ink" && "q-eyebrow--ink", className]
				.filter(Boolean)
				.join(" ")}
			style={style}
		>
			{index != null && <span className="q-eyebrow__index">{index}</span>}
			<span>{children}</span>
		</div>
	);
}
