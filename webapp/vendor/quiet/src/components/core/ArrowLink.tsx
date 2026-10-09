import type React from "react";
import { useLinkElement } from "../../lib/link";
import "./ArrowLink.scss";

/** Inline text link with trailing arrow and hairline underline. */
export interface ArrowLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href?: string;
	/** Glyph after the label. Default →; use ↘ for in-page jumps. */
	arrow?: string;
	children?: React.ReactNode;
}

export function ArrowLink({
	href = "#",
	arrow = "→",
	children,
	className,
	style,
	...rest
}: ArrowLinkProps) {
	const A = useLinkElement(href);
	return (
		<A
			href={href}
			{...rest}
			className={["q-arrow-link", className].filter(Boolean).join(" ")}
			style={style}
		>
			{children}
			<span aria-hidden="true">{arrow}</span>
		</A>
	);
}
