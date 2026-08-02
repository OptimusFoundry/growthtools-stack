import type {
	CSSProperties,
	ElementType,
	MouseEvent as ReactMouseEvent,
	ReactNode,
} from "react";
import { cn } from "../../../utils/cn";
import styles from "./Card.module.scss";

export type CardVariant = "elevated" | "outlined" | "filled" | "spec";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
	/** Visual variant */
	variant?: CardVariant;
	/** Padding size */
	padding?: CardPadding;
	/** Make card interactive (hover effects) */
	interactive?: boolean;
	/** Card content */
	children: ReactNode;
	/** HTML element to render */
	as?: ElementType;
	/** Additional className */
	className?: string;
	/** Inline styles */
	style?: CSSProperties;
	/** Click handler for interactive cards */
	onClick?: () => void;
	/** Context-menu (right-click) handler — e.g. canvas nodes with a custom menu */
	onContextMenu?: (e: ReactMouseEvent) => void;
}

/**
 * Card component for grouping related content.
 *
 * @example
 * ```tsx
 * <Card variant="elevated" padding="lg">
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </Card>
 * ```
 */
export function Card({
	variant = "outlined",
	padding = "md",
	interactive = false,
	children,
	as: Component = "div",
	className,
	style,
	onClick,
	onContextMenu,
}: CardProps) {
	return (
		<Component
			className={cn(
				styles.card,
				styles[variant],
				styles[`padding-${padding}`],
				interactive && styles.interactive,
				className,
			)}
			style={style}
			onClick={onClick}
			onContextMenu={onContextMenu}
			role={interactive ? "button" : undefined}
			tabIndex={interactive ? 0 : undefined}
		>
			{children}
		</Component>
	);
}

Card.displayName = "Card";

// Card sub-components
export interface CardHeaderProps {
	/**
	 * Editorial card name. When provided alongside `meta`, renders the
	 * spec-style header: serif name on the left (supports `<em>` accent),
	 * uppercase mono caption on the right. Falls back to `children` otherwise.
	 */
	name?: ReactNode;
	/** Uppercase mono caption rendered on the right of the spec header. */
	meta?: ReactNode;
	children?: ReactNode;
	className?: string;
}

export function CardHeader({
	name,
	meta,
	children,
	className,
}: CardHeaderProps) {
	if (name !== undefined || meta !== undefined) {
		return (
			<div className={cn(styles.header, styles.specHeader, className)}>
				{name !== undefined && <span className={styles.specName}>{name}</span>}
				{meta !== undefined && <span className={styles.specMeta}>{meta}</span>}
			</div>
		);
	}
	return <div className={cn(styles.header, className)}>{children}</div>;
}

CardHeader.displayName = "CardHeader";

export interface CardBodyProps {
	children: ReactNode;
	className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
	return <div className={cn(styles.body, className)}>{children}</div>;
}

CardBody.displayName = "CardBody";

export interface CardFooterProps {
	children: ReactNode;
	className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
	return <div className={cn(styles.footer, className)}>{children}</div>;
}

CardFooter.displayName = "CardFooter";
