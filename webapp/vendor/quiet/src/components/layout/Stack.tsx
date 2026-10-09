import React from "react";
import "./Stack.scss";

/**
 * Flex row/column on the 8px grid.
 * @startingPoint section="Layout" subtitle="Flex stacks on the 8px grid" viewport="700x200"
 */
export interface StackProps {
	direction?: "row" | "column" | "row-reverse" | "column-reverse";
	/** xs 8 · sm 16 · md 24 · lg 32 · xl 48 · 2xl 64, or px */
	gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
	align?: React.CSSProperties["alignItems"];
	justify?: React.CSSProperties["justifyContent"];
	wrap?: boolean;
	/** Children rise in, 60ms apart */
	animated?: boolean;
	as?: keyof React.JSX.IntrinsicElements;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const GAPS: (string | number)[] = ["none", "xs", "sm", "md", "lg", "xl", "2xl"];
const DIRS: string[] = ["row", "column", "row-reverse", "column-reverse"];
const px = (v: string | number | undefined) => (typeof v === "number" ? `${v}px` : v);

export function Stack({
	direction = "column",
	gap = "sm",
	align,
	justify,
	wrap = false,
	animated = false,
	as = "div",
	children,
	className,
	style,
}: StackProps) {
	const Tag = as as React.ElementType;
	const named = GAPS.includes(gap);
	const cls = [
		"q-stack",
		DIRS.includes(direction) && `q-stack--${direction}`,
		named && `q-stack--gap-${gap}`,
		wrap && "q-stack--wrap",
		className,
	]
		.filter(Boolean)
		.join(" ");
	const vars = {
		...(!named && { "--_gap": px(gap) }),
		...(align && { "--_align": align }),
		...(justify && { "--_justify": justify }),
	};
	const kids = animated
		? React.Children.toArray(children).map((c, i) => (
				<div key={i} className="q-stack__item" style={{ "--_i": i } as React.CSSProperties}>
					{c}
				</div>
			))
		: children;
	return (
		<Tag className={cls} style={{ ...vars, ...style }}>
			{kids}
		</Tag>
	);
}
