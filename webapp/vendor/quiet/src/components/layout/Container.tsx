import type React from "react";
import "./Container.scss";

/**
 * Max-width page column with 32px gutters. 1280 by default.
 * @startingPoint section="Layout" subtitle="Max-width column" viewport="900x200"
 */
export interface ContainerProps {
	size?: "sm" | "md" | "lg" | "xl" | "full" | number;
	/** 32px side gutters */
	padded?: boolean;
	centered?: boolean;
	as?: keyof React.JSX.IntrinsicElements;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: (string | number)[] = ["sm", "md", "lg", "xl", "full"];

export function Container({
	size = "xl",
	padded = true,
	centered = true,
	as = "div",
	children,
	className,
	style,
}: ContainerProps) {
	const Tag = as as React.ElementType;
	const named = SIZES.includes(size);
	const cls = [
		"q-container",
		named && `q-container--${size}`,
		!padded && "q-container--flush",
		!centered && "q-container--start",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<Tag
			className={cls}
			style={{
				...(!named && { "--_max": typeof size === "number" ? `${size}px` : size }),
				...style,
			}}
		>
			{children}
		</Tag>
	);
}
