import React from "react";
import { Grid } from "./Grid";
import "./Col.scss";

/**
 * One cell of the 12-column grid. Use inside <Grid columns={12}>.
 * @startingPoint section="Layout" subtitle="12-column spans" viewport="900x200"
 */
export interface ColProps {
	/** 1–12 */
	span?: number;
	/** Span when the parent Grid is 720–960px wide. Default: span < 4 → 6, else span */
	spanMd?: number;
	/** Span when the parent Grid is under 720px. Default 12 */
	spanSm?: number;
	/** 1-based start column */
	start?: number;
	rowSpan?: number;
	as?: keyof React.JSX.IntrinsicElements;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function Col({
	span = 12,
	spanMd,
	spanSm,
	start,
	rowSpan,
	as = "div",
	children,
	className,
	style,
}: ColProps) {
	const bp = React.useContext(Grid.Ctx || React.createContext("lg"));
	const eff = bp === "sm" ? (spanSm ?? 12) : bp === "md" ? (spanMd ?? (span < 4 ? 6 : span)) : span;
	const st = bp === "lg" ? start : undefined;
	const rs = rowSpan && bp !== "sm" ? rowSpan : undefined;
	const Tag = as as React.ElementType;
	const cls = ["q-col", st && "q-col--start", rs && "q-col--row-span", className]
		.filter(Boolean)
		.join(" ");
	return (
		<Tag
			className={cls}
			style={{
				"--_span": eff,
				...(st && { "--_start": st }),
				...(rs && { "--_row-span": rs }),
				...style,
			}}
		>
			{children}
		</Tag>
	);
}
