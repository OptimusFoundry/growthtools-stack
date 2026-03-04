import type { ElementType, ReactNode } from "react";

export type TextElement =
	| "p"
	| "span"
	| "div"
	| "label"
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "h5"
	| "h6"
	| "strong"
	| "em"
	| "small"
	| "mark"
	| "del"
	| "ins"
	| "sub"
	| "sup"
	| "code"
	| "kbd"
	| "samp";

export type TextSize =
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "5xl";

export type TextWeight = "normal" | "medium" | "semibold" | "bold";

export type TextColor =
	| "default"
	| "muted"
	| "primary"
	| "secondary"
	| "success"
	| "warning"
	| "error"
	| "inherit";

export type TextAlign = "left" | "center" | "right" | "justify";

export interface TextProps {
	/** The HTML element to render */
	as?: ElementType;
	/** Font size */
	size?: TextSize;
	/** Font weight */
	weight?: TextWeight;
	/** Text color */
	color?: TextColor;
	/** Text alignment */
	align?: TextAlign;
	/** Truncate text with ellipsis */
	truncate?: boolean;
	/** Limit to specific number of lines with ellipsis */
	lineClamp?: number;
	/** Make text italic */
	italic?: boolean;
	/** Add underline */
	underline?: boolean;
	/** Add strikethrough */
	strikethrough?: boolean;
	/** Transform text case */
	transform?: "uppercase" | "lowercase" | "capitalize" | "none";
	/** Prevent text wrapping */
	nowrap?: boolean;
	/** Text content */
	children?: ReactNode;
	/** Additional class name */
	className?: string;
	/** Inline styles */
	style?: React.CSSProperties;
}
