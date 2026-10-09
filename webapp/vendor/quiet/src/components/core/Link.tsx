import type React from "react";
import { useLinkElement } from "../../lib/link";
import "./Link.scss";

/**
 * Inline text link. Ink → molten on hover. For a standalone CTA link use ArrowLink.
 * @startingPoint section="Actions" subtitle="Inline text links" viewport="600x160"
 */
export interface LinkProps
	extends Omit<
		React.AnchorHTMLAttributes<HTMLAnchorElement>,
		"href" | "children" | "className" | "style"
	> {
	href?: string;
	variant?: "default" | "primary" | "muted";
	size?: "inherit" | "sm" | "md" | "lg";
	underline?: "hover" | "always" | "none";
	/** Opens in new tab, appends ↗ */
	external?: boolean;
	rightIcon?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES: string[] = ["sm", "md", "lg"];

export function Link({
	href = "#",
	variant = "default",
	size = "inherit",
	underline = "hover",
	external = false,
	rightIcon,
	children,
	className,
	style,
	...rest
}: LinkProps) {
	const cls = [
		"q-link",
		variant === "primary" || variant === "muted" ? `q-link--${variant}` : null,
		SIZES.includes(size) && `q-link--${size}`,
		(underline === "always" || underline === "hover") && `q-link--underline-${underline}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	const A = useLinkElement(href, external);
	return (
		<A
			href={href}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
			{...rest}
			className={cls}
			style={style}
		>
			{children}
			{(rightIcon || external) && <span aria-hidden="true">{rightIcon || "↗"}</span>}
			{external && <span className="q-sr-only"> (opens in new tab)</span>}
		</A>
	);
}
