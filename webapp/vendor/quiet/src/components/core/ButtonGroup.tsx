import type React from "react";
import "./ButtonGroup.scss";

/**
 * Groups Buttons — spaced or attached into one pill.
 * @startingPoint section="Actions" subtitle="Spaced or attached button sets" viewport="700x200"
 */
export interface ButtonGroupProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className" | "style"> {
	children?: React.ReactNode;
	/** Join into one segmented pill with hairline separators */
	attached?: boolean;
	vertical?: boolean;
	spacing?: "sm" | "md" | "lg" | number;
	fullWidth?: boolean;
	/** Accessible name for the role="group" (e.g. "Text formatting") */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

const SPACING: unknown[] = ["sm", "md", "lg"];

export function ButtonGroup({
	children,
	attached = false,
	vertical = false,
	spacing = "sm",
	fullWidth = false,
	label,
	className,
	style,
	...rest
}: ButtonGroupProps) {
	const custom = !SPACING.includes(spacing);
	const cls = [
		"q-button-group",
		!custom && `q-button-group--${spacing}`,
		vertical && "q-button-group--vertical",
		attached && "q-button-group--attached",
		fullWidth && "q-button-group--full",
		className,
	]
		.filter(Boolean)
		.join(" ");
	const gap: Record<string, string> | null = custom
		? { "--_gap": typeof spacing === "number" ? `${spacing}px` : spacing }
		: null;
	return (
		<div
			role="group"
			aria-label={label}
			{...rest}
			className={cls}
			style={gap ? { ...gap, ...style } : style}
		>
			{children}
		</div>
	);
}
