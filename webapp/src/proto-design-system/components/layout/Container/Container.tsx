import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Container.module.scss";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ContainerProps {
	/** Container max-width size */
	size?: ContainerSize;
	/** Center the container */
	centered?: boolean;
	/** Add horizontal padding */
	padded?: boolean;
	/** Container content */
	children: ReactNode;
	/** HTML element to render */
	as?: ElementType;
	/** Additional className */
	className?: string;
	/** Inline styles */
	style?: CSSProperties;
}

/**
 * Container component for constraining content width.
 *
 * @example
 * ```tsx
 * <Container size="lg" centered padded>
 *   <h1>Page content</h1>
 * </Container>
 * ```
 */
export function Container({
	size = "lg",
	centered = true,
	padded = true,
	children,
	as: Component = "div",
	className,
	style,
}: ContainerProps) {
	return (
		<Component
			className={cn(
				styles.container,
				styles[`size-${size}`],
				centered && styles.centered,
				padded && styles.padded,
				className,
			)}
			style={style}
		>
			{children}
		</Component>
	);
}

Container.displayName = "Container";
