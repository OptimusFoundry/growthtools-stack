import type React from "react";
import "./Text.scss";

/**
 * Typography primitive — body sizes, weights, colors, mono labels, headings, truncation.
 * @startingPoint section="Type" subtitle="Sizes, weights, colors, clamps" viewport="700x320"
 */
export interface TextProps
	extends Omit<React.HTMLAttributes<HTMLElement>, "color" | "children" | "className" | "style"> {
	as?: keyof React.JSX.IntrinsicElements;
	/** 1–4 shortcuts to the heading scale (for headlines with an italic accent + period, use Headline) */
	heading?: 1 | 2 | 3 | 4;
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | number;
	weight?: "normal" | "medium" | "semibold" | "bold";
	color?:
		| "default"
		| "heading"
		| "muted"
		| "quiet"
		| "primary"
		| "success"
		| "warning"
		| "error"
		| "inherit";
	/** JetBrains Mono 11px caps +0.08em */
	mono?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	transform?: "uppercase" | "lowercase" | "capitalize";
	truncate?: boolean;
	lineClamp?: number;
	align?: "left" | "center" | "right";
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: Record<string, number> = {
	xs: 12,
	sm: 13,
	md: 15,
	lg: 17,
	xl: 19,
	"2xl": 24,
	"3xl": 30,
	"4xl": 40,
	"5xl": 52,
};
const COLORS: string[] = [
	"default",
	"heading",
	"muted",
	"quiet",
	"primary",
	"success",
	"warning",
	"error",
	"inherit",
];
const WEIGHTS: string[] = ["normal", "medium", "semibold", "bold"];
const HEADINGS: Record<number, { size: string; weight: string }> = {
	1: { size: "5xl", weight: "bold" },
	2: { size: "4xl", weight: "bold" },
	3: { size: "3xl", weight: "semibold" },
	4: { size: "2xl", weight: "semibold" },
};

export function Text({
	as,
	heading,
	size,
	weight,
	color,
	mono = false,
	italic = false,
	underline = false,
	strike = false,
	transform,
	truncate = false,
	lineClamp,
	align,
	children,
	className,
	style,
	...rest
}: TextProps) {
	const hd = heading ? HEADINGS[heading] : null;
	const Tag = (as || (hd ? `h${heading}` : "p")) as React.ElementType;
	const sz = size || (hd ? hd.size : mono ? "xs" : "md");
	const numeric = typeof sz === "number";
	const px = numeric ? sz : SIZES[sz];
	const w = weight || (hd ? hd.weight : "normal");
	const c = color || (hd ? "heading" : mono ? "muted" : "default");
	const knownColor = COLORS.includes(c);
	const vars: Record<string, string | number> = {};
	if (numeric) vars["--_size"] = `${sz}px`;
	if (!knownColor) vars["--_color"] = c;
	if (lineClamp) vars["--_lines"] = lineClamp;
	const cls = [
		"q-text",
		mono && !size
			? "q-text--size-mono"
			: numeric
				? "q-text--size-custom"
				: SIZES[sz] && `q-text--size-${sz}`,
		WEIGHTS.includes(w) && `q-text--weight-${w}`,
		`q-text--color-${knownColor ? c : "custom"}`,
		hd ? `q-text--h${heading}` : px! >= 24 && "q-text--large",
		mono && "q-text--mono",
		!mono && transform && `q-text--${transform}`,
		italic && "q-text--italic",
		underline && "q-text--underline",
		strike && "q-text--strike",
		align && `q-text--align-${align}`,
		truncate && "q-text--truncate",
		lineClamp && "q-text--clamp",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<Tag className={cls} style={Object.keys(vars).length ? { ...vars, ...style } : style} {...rest}>
			{children}
		</Tag>
	);
}
