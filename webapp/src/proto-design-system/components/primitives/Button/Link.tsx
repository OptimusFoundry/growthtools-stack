import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";
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
	/**
	 * Optional router-aware link component (e.g. TanStack Router's `Link`).
	 * When provided, renders this instead of a plain `<a>` and forwards
	 * `to` / `className` / `target` / `rel` so client-side navigation works.
	 */
	LinkComponent?: ComponentType<{
		to: string;
		className?: string;
		target?: string;
		rel?: string;
		children: ReactNode;
	}>;
	/**
	 * Internal route path. Required when `LinkComponent` is provided;
	 * otherwise `href` is used.
	 */
	to?: string;
}

/**
 * Link component - styled hyperlink for inline or standalone text links.
 *
 * @example
 * ```tsx
 * <Link href="/about">About us</Link>
 * <Link href="https://tickuptoks.com" target="_blank" rightIcon={<ExternalLink size="1em" />}>
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
			LinkComponent,
			to,
			...props
		},
		ref,
	) => {
		const linkClasses = cn(
			styles.link,
			styles[variant],
			styles[`size-${size}`],
			underlineOnHover && styles.underlineOnHover,
			className,
		);

		// Add rel="noopener noreferrer" for external links
		const safeRel =
			target === "_blank" ? `${rel || ""} noopener noreferrer`.trim() : rel;

		const content = (
			<>
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
			</>
		);

		if (LinkComponent && to) {
			return (
				<LinkComponent
					to={to}
					className={linkClasses}
					target={target}
					rel={safeRel}
				>
					{content}
				</LinkComponent>
			);
		}

		return (
			<a
				ref={ref}
				href={href}
				target={target}
				rel={safeRel}
				className={linkClasses}
				{...props}
			>
				{content}
			</a>
		);
	},
);

Link.displayName = "Link";
