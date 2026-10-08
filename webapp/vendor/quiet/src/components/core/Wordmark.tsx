import type React from "react";
import "./Wordmark.scss";

/** The typeset wordmark. The O·F mark is NOT included — supply FoundryMark.svg and place it to the left. */
export interface WordmarkProps {
	/** nav = 15px, footer = 28px, or a number */
	size?: "nav" | "footer" | number;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: Record<string, number> = { nav: 15, footer: 28 };

export function Wordmark({ size = "nav", className, style }: WordmarkProps) {
	const custom = typeof size === "number";
	const cls = [
		"q-wordmark",
		custom ? "q-wordmark--custom" : SIZES[size] && `q-wordmark--${size}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<span
			className={cls}
			style={custom ? ({ "--_size": `${size}px`, ...style } as React.CSSProperties) : style}
		>
			Optimus Foundry<span className="q-wordmark__period">.</span>
		</span>
	);
}
