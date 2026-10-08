import type React from "react";
import "./Icon.scss";

/**
 * Unicode glyph icon. The brand has no icon set — glyphs carry meaning (→ ↘ ↗ × ✓ · …).
 * @startingPoint section="Primitives" subtitle="Named unicode glyphs" viewport="600x160"
 */
export interface IconProps {
	/** Named glyph: arrow-right, arrow-left, arrow-up, arrow-down, expand, external, close, check, plus, minus, dot, more, slash, command, enter, info, warning, help, first, last, sort, prev, next */
	name?: string;
	/** Any literal glyph; overrides name */
	glyph?: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
	color?:
		| "inherit"
		| "default"
		| "muted"
		| "quiet"
		| "primary"
		| "success"
		| "warning"
		| "error"
		| string;
	/** Accessible label; omit for decorative glyphs */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

const GLYPHS: Record<string, string> = {
	"arrow-right": "→",
	"arrow-left": "←",
	"arrow-up": "↑",
	"arrow-down": "↓",
	expand: "↘",
	external: "↗",
	close: "×",
	check: "✓",
	plus: "+",
	minus: "−",
	dot: "·",
	more: "…",
	slash: "/",
	command: "⌘",
	enter: "↵",
	info: "i",
	warning: "!",
	help: "?",
	first: "«",
	last: "»",
	sort: "↕",
	prev: "‹",
	next: "›",
};
const SIZES: unknown[] = ["xs", "sm", "md", "lg", "xl", "2xl"];
const COLORS: string[] = [
	"default",
	"muted",
	"quiet",
	"primary",
	"success",
	"warning",
	"error",
	"inherit",
];

export function Icon({
	name = "arrow-right",
	glyph,
	size = "md",
	color = "inherit",
	label,
	className,
	style,
}: IconProps) {
	const numeric = typeof size === "number";
	const knownColor = COLORS.includes(color);
	const vars: Record<string, string> = {};
	if (numeric) vars["--_size"] = `${size}px`;
	if (!knownColor) vars["--_color"] = color;
	const cls = [
		"q-icon",
		numeric ? "q-icon--custom-size" : `q-icon--${SIZES.includes(size) ? size : "md"}`,
		`q-icon--${knownColor ? color : "custom-color"}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<span
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={cls}
			style={numeric || !knownColor ? { ...vars, ...style } : style}
		>
			{glyph ?? GLYPHS[name] ?? name}
		</span>
	);
}
Icon.glyphs = GLYPHS;
