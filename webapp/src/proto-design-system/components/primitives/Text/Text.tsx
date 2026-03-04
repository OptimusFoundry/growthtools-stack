import type { ElementType, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Text.module.scss";
import type { TextAlign, TextColor, TextSize, TextWeight } from "./Text.types";

interface TextOwnProps {
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

/**
 * Text component for rendering typography with consistent styling.
 *
 * @example
 * ```tsx
 * <Text>Default paragraph text</Text>
 * <Text as="h1" size="4xl" weight="bold">Page Title</Text>
 * <Text size="sm" color="muted">Helper text</Text>
 * <Text truncate>Very long text that will be truncated...</Text>
 * ```
 */
export function Text({
	as: Component = "p",
	size = "md",
	weight,
	color = "default",
	align,
	truncate = false,
	lineClamp,
	italic = false,
	underline = false,
	strikethrough = false,
	transform,
	nowrap = false,
	className,
	children,
	style,
	...props
}: TextOwnProps & React.ComponentPropsWithoutRef<ElementType>) {
	const textClasses = cn(
		styles.text,
		styles[`size-${size}`],
		weight && styles[`weight-${weight}`],
		styles[`color-${color}`],
		align && styles[`align-${align}`],
		truncate && styles.truncate,
		lineClamp && styles.lineClamp,
		italic && styles.italic,
		underline && styles.underline,
		strikethrough && styles.strikethrough,
		transform && styles[`transform-${transform}`],
		nowrap && styles.nowrap,
		className,
	);

	const inlineStyles = lineClamp
		? { ...style, "--line-clamp": lineClamp }
		: style;

	return (
		<Component
			className={textClasses}
			style={inlineStyles as React.CSSProperties}
			{...props}
		>
			{children}
		</Component>
	);
}

Text.displayName = "Text";
