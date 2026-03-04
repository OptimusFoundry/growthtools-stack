import { motion, type Variants } from "motion/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { useMotionConfig } from "../../../hooks/useMotionConfig";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Button.module.scss";
import type { ButtonSize, ButtonVariant } from "./Button.types";

export interface LinkButtonProps
	extends AnchorHTMLAttributes<HTMLAnchorElement> {
	/** Visual style variant */
	variant?: ButtonVariant;
	/** Size of the button */
	size?: ButtonSize;
	/** Makes button take full width of container */
	isFullWidth?: boolean;
	/** Renders button as icon-only (square aspect ratio) */
	isIconOnly?: boolean;
	/** Icon to display before children */
	leftIcon?: ReactNode;
	/** Icon to display after children */
	rightIcon?: ReactNode;
	/** Button content */
	children?: ReactNode;
}

const linkVariants: Variants = {
	idle: { scale: 1 },
	hover: { scale: 1.02 },
	tap: { scale: 0.98 },
};

/**
 * LinkButton component - renders as an anchor with button styling.
 * Use for navigation that should look like a button.
 *
 * @example
 * ```tsx
 * <LinkButton href="/dashboard" variant="primary">Go to Dashboard</LinkButton>
 * <LinkButton href="/docs" variant="ghost" leftIcon={<Book size="1em" />}>Documentation</LinkButton>
 * ```
 */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
	(
		{
			variant = "default",
			size = "md",
			isFullWidth = false,
			isIconOnly = false,
			leftIcon,
			rightIcon,
			children,
			className,
			href,
			target,
			rel,
			onClick,
			onFocus,
			onBlur,
			onKeyDown,
			onKeyUp,
			onMouseEnter,
			onMouseLeave,
			style,
			id,
			tabIndex,
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledBy,
			"aria-describedby": ariaDescribedBy,
			...rest
		},
		ref,
	) => {
		const prefersReducedMotion = useReducedMotion();
		const { springConfig } = useMotionConfig();

		const linkClasses = cn(
			styles.button,
			styles[variant],
			styles[size],
			isFullWidth && styles.fullWidth,
			isIconOnly && styles.iconOnly,
			className,
		);

		// Add rel="noopener noreferrer" for external links
		const safeRel =
			target === "_blank" ? `${rel || ""} noopener noreferrer`.trim() : rel;

		const filteredRest = Object.fromEntries(
			Object.entries(rest).filter(([, v]) => v !== undefined),
		);

		return (
			<motion.a
				ref={ref}
				href={href}
				target={target}
				rel={safeRel}
				className={linkClasses}
				variants={prefersReducedMotion ? undefined : linkVariants}
				initial="idle"
				whileHover="hover"
				whileTap="tap"
				transition={springConfig}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-describedby={ariaDescribedBy}
				onClick={onClick}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				onKeyUp={onKeyUp}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				style={style}
				id={id}
				tabIndex={tabIndex}
				{...filteredRest}
			>
				<span className={styles.content}>
					{leftIcon && (
						<span className={styles.icon} aria-hidden="true">
							{leftIcon}
						</span>
					)}
					{children}
					{rightIcon && (
						<span className={styles.icon} aria-hidden="true">
							{rightIcon}
						</span>
					)}
				</span>
			</motion.a>
		);
	},
);

LinkButton.displayName = "LinkButton";
