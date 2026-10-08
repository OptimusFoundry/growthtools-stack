import React from "react";
import "./Badge.scss";

/**
 * Sans pill for counts and statuses. Status reads through the dot, not a color fill.
 * @startingPoint section="Primitives" subtitle="Counts and status pills" viewport="700x180"
 */
export interface BadgeProps {
	variant?: "default" | "primary" | "secondary" | "outline" | "success" | "warning" | "error";
	size?: "sm" | "md" | "lg";
	/** Leading status dot (on by default for success/warning/error) */
	dot?: boolean;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	/** Numeric badge; collapses to max+ */
	count?: number;
	max?: number;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: string[] = ["sm", "md", "lg"];
const DOTS: Record<string, string> = { success: "solid-ink", warning: "hollow", error: "molten" };
const VARIANTS: string[] = [
	"default",
	"primary",
	"secondary",
	"outline",
	"success",
	"warning",
	"error",
];

export function Badge({
	variant = "default",
	size = "md",
	dot,
	leftIcon,
	rightIcon,
	count,
	max = 99,
	children,
	className,
	style,
}: BadgeProps) {
	const v = VARIANTS.includes(variant) ? variant : "default";
	const showDot = dot ?? (!!DOTS[v] && !leftIcon);
	const dotKind = DOTS[v] || (variant === "primary" ? "paper" : "solid-ink");
	const isCount = count != null;
	const label = isCount ? (count > max ? `${max}+` : count) : children;
	// A changed count rises in softly; the first render is static.
	const prev = React.useRef(label);
	const [tick, setTick] = React.useState(0);
	React.useEffect(() => {
		if (isCount && prev.current !== label) setTick((t) => t + 1);
		prev.current = label;
	}, [isCount, label]);
	const cls = [
		"q-badge",
		`q-badge--${v}`,
		`q-badge--${SIZES.includes(size) ? size : "md"}`,
		isCount && "q-badge--count",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<span className={cls} style={style}>
			{showDot && <span aria-hidden="true" className={`q-badge__dot q-badge__dot--${dotKind}`} />}
			{leftIcon}
			{tick ? (
				<span key={tick} className="q-anim-rise" data-state="open">
					{label}
				</span>
			) : (
				label
			)}
			{rightIcon}
		</span>
	);
}
