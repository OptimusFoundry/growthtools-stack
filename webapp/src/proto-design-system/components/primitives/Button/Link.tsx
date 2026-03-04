import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Link.module.scss";

export type LinkVariant = "default" | "muted" | "primary";
export type LinkSize = "sm" | "md" | "lg";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	/** Visual style variant */
	variant?: LinkVariant;
	/** Size of the link */
	size?: LinkSize;
	/** Whether to show underline only on hover */
	underlineOnHover?: boolean;
	/** Icon to display before text */
	leftIcon?: ReactNode;
	/** Icon to display after text */
	rightIcon?: ReactNode;
	/** Link content */
	children?: ReactNode;
}

/**
 * Link component - styled hyperlink for inline or standalone text links.
 *
 * @example
 * ```tsx
 * <Link href="/about">About us</Link>
 * <Link href="https://example.com" target="_blank" rightIcon={<ExternalLink size="1em" />}>
 *   Visit website
 * </Link>
 * ```
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
	(
		{
			variant = "default",
			size = "md",
			underlineOnHover = false,
			leftIcon,
			rightIcon,
			children,
			className,
			href,
			target,
			rel,
			...props
		},
		ref,
	) => {
		const linkClasses = cn(
			styles.link,
			styles[variant],
			styles[size],
			underlineOnHover && styles.underlineOnHover,
			className,
		);

		// Add rel="noopener noreferrer" for external links
		const safeRel =
			target === "_blank" ? `${rel || ""} noopener noreferrer`.trim() : rel;

		return (
			<a
				ref={ref}
				href={href}
				target={target}
				rel={safeRel}
				className={linkClasses}
				{...props}
			>
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
			</a>
		);
	},
);

Link.displayName = "Link";
