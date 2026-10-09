import React from "react";
import "./Grid.scss";

/**
 * CSS grid on the 8px scale. Fixed columns or responsive auto-fit by min child width.
 * @startingPoint section="Layout" subtitle="Grids — fixed or auto-fit" viewport="800x260"
 */
export interface GridProps {
	/** Count or a raw grid-template-columns string */
	columns?: number | string;
	/** Responsive auto-fit; overrides columns */
	minChildWidth?: number | string;
	gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
	rowGap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
	align?: React.CSSProperties["alignItems"];
	animated?: boolean;
	/** Container widths for sm / md breakpoints that Col reads. Default [720, 960] */
	breakpoints?: [number, number];
	as?: keyof React.JSX.IntrinsicElements;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const GAPS: (string | number)[] = ["none", "xs", "sm", "md", "lg", "xl", "2xl"];
const GridCtx = React.createContext<"sm" | "md" | "lg">("lg");
const px = (v: string | number | undefined) => (typeof v === "number" ? `${v}px` : v);

export function Grid({
	columns = 3,
	minChildWidth,
	gap = "md",
	rowGap,
	align,
	animated = false,
	breakpoints = [720, 960],
	as = "div",
	children,
	className,
	style,
}: GridProps) {
	const Tag = as as React.ElementType;
	const ref = React.useRef<HTMLElement>(null);
	const [bp, setBp] = React.useState<"sm" | "md" | "lg">("lg");
	React.useEffect(() => {
		if (!ref.current || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(([e]) => {
			const w = e!.contentRect.width;
			setBp(w < breakpoints[0] ? "sm" : w < breakpoints[1] ? "md" : "lg");
		});
		ro.observe(ref.current);
		return () => ro.disconnect();
	}, [breakpoints[0], breakpoints[1]]);
	const mode = minChildWidth ? "auto" : typeof columns === "number" ? null : "template";
	const namedGap = GAPS.includes(gap);
	const namedRow = rowGap != null && GAPS.includes(rowGap);
	const cls = [
		"q-grid",
		mode && `q-grid--${mode}`,
		namedGap && `q-grid--gap-${gap}`,
		namedRow && `q-grid--row-gap-${rowGap}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	const vars = {
		...(mode === "auto"
			? { "--_min": px(minChildWidth) }
			: mode === "template"
				? { "--_template": columns }
				: { "--_cols": columns }),
		...(!namedGap && { "--_gap": px(gap) }),
		...(rowGap != null && !namedRow && { "--_row-gap": px(rowGap) }),
		...(align && { "--_align": align }),
	};
	const kids = animated
		? React.Children.toArray(children).map((c, i) => (
				<div key={i} className="q-grid__item" style={{ "--_i": i } as React.CSSProperties}>
					{c}
				</div>
			))
		: children;
	return (
		<GridCtx.Provider value={bp}>
			<Tag ref={ref} data-bp={bp} className={cls} style={{ ...vars, ...style }}>
				{kids}
			</Tag>
		</GridCtx.Provider>
	);
}
Grid.Ctx = GridCtx;
