import { motion, type Variants } from "motion/react";
import { Children, type ReactNode } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./List.module.scss";

export type ListVariant = "default" | "divided" | "bordered";
export type ListSize = "sm" | "md" | "lg";

export interface ListProps {
	/** List variant */
	variant?: ListVariant;
	/** List size */
	size?: ListSize;
	/** List items */
	children: ReactNode;
	/** Enable stagger animation for list items */
	animate?: boolean;
	/** Additional className */
	className?: string;
}

// Animation variants for stagger effect
const listVariants: Variants = {
	hidden: { opacity: 1 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
		},
	},
};

const itemVariants: Variants = {
	hidden: { opacity: 0, x: -8 },
	visible: {
		opacity: 1,
		x: 0,
		transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
	},
};

/**
 * List component for displaying a collection of items.
 *
 * @example
 * ```tsx
 * <List>
 *   <ListItem>Item 1</ListItem>
 *   <ListItem>Item 2</ListItem>
 * </List>
 *
 * // With stagger animation
 * <List animate>
 *   <ListItem>Item 1</ListItem>
 *   <ListItem>Item 2</ListItem>
 * </List>
 * ```
 */
export function List({
	variant = "default",
	size = "md",
	children,
	animate = false,
	className,
}: ListProps) {
	const prefersReducedMotion = useReducedMotion();
	const shouldAnimate = animate && !prefersReducedMotion;

	if (shouldAnimate) {
		return (
			<motion.ul
				className={cn(
					styles.list,
					styles[variant],
					styles[`size-${size}`],
					className,
				)}
				variants={listVariants}
				initial="hidden"
				animate="visible"
			>
				{Children.map(children, (child) => (
					<motion.div variants={itemVariants}>{child}</motion.div>
				))}
			</motion.ul>
		);
	}

	return (
		<ul
			className={cn(
				styles.list,
				styles[variant],
				styles[`size-${size}`],
				className,
			)}
		>
			{children}
		</ul>
	);
}

export interface ListItemProps {
	/** Item content */
	children: ReactNode;
	/** Leading element (icon, avatar, etc.) */
	leading?: ReactNode;
	/** Trailing element (badge, action, etc.) */
	trailing?: ReactNode;
	/** Secondary text */
	secondary?: ReactNode;
	/** Selected state */
	selected?: boolean;
	/** Disabled state */
	disabled?: boolean;
	/** Click handler */
	onClick?: () => void;
	/** Additional className */
	className?: string;
}

export function ListItem({
	children,
	leading,
	trailing,
	secondary,
	selected = false,
	disabled = false,
	onClick,
	className,
}: ListItemProps) {
	const isInteractive = onClick !== undefined;

	return (
		<li
			className={cn(
				styles.item,
				selected && styles.selected,
				disabled && styles.disabled,
				isInteractive && styles.interactive,
				className,
			)}
			onClick={disabled ? undefined : onClick}
			role={isInteractive ? "button" : undefined}
			tabIndex={isInteractive && !disabled ? 0 : undefined}
			onKeyDown={
				isInteractive && !disabled
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick?.();
							}
						}
					: undefined
			}
			aria-selected={selected || undefined}
			aria-disabled={disabled || undefined}
		>
			{leading && <span className={styles.leading}>{leading}</span>}
			<div className={styles.content}>
				<span className={styles.primary}>{children}</span>
				{secondary && <span className={styles.secondary}>{secondary}</span>}
			</div>
			{trailing && <span className={styles.trailing}>{trailing}</span>}
		</li>
	);
}

export interface ListGroupProps {
	/** Group label */
	label: string;
	/** Group items */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function ListGroup({ label, children, className }: ListGroupProps) {
	return (
		<li className={cn(styles.group, className)}>
			<div className={styles.groupLabel}>{label}</div>
			<ul className={styles.groupItems}>{children}</ul>
		</li>
	);
}

List.displayName = "List";
ListItem.displayName = "ListItem";
ListGroup.displayName = "ListGroup";
