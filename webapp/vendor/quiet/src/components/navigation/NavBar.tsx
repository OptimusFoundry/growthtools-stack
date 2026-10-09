import type React from "react";
import { useLinkElement } from "../../lib/link";
import { Button } from "../core/Button";
import { Wordmark } from "../core/Wordmark";
import "./NavBar.scss";

/**
 * Site header: wordmark, text links, ink pill CTA, soft hairline below.
 * @startingPoint section="Navigation" subtitle="Site header" viewport="1100x120"
 */
export interface NavBarProps {
	/** `current` marks the link for the page you are on (aria-current="page") */
	links?: Array<{ label: string; href: string; current?: boolean }>;
	cta?: React.ReactNode;
	ctaHref?: string;
	onCta?: () => void;
	/** Optional mark element (28px) shown left of the wordmark */
	mark?: React.ReactNode;
	/** Accessible name for the nav landmark */
	label?: string;
	/** Accessible name for the wordmark home link (defaults to the wordmark text) */
	homeLabel?: string;
	className?: string;
	style?: React.CSSProperties;
}

function NavLink({
	href,
	current,
	children,
}: {
	href: string;
	current?: boolean;
	children: React.ReactNode;
}) {
	const A = useLinkElement(href);
	return (
		<A href={href} aria-current={current ? "page" : undefined} className="q-nav-bar__link">
			{children}
		</A>
	);
}

export function NavBar({
	links = [],
	cta = "Start a project",
	ctaHref = "#contact",
	onCta,
	mark,
	label = "Main",
	homeLabel,
	className,
	style,
}: NavBarProps) {
	return (
		<nav
			aria-label={label}
			className={className ? `q-nav-bar ${className}` : "q-nav-bar"}
			style={style}
		>
			<a href="#" aria-label={homeLabel} className="q-nav-bar__home">
				{mark}
				<Wordmark size="nav" />
			</a>
			<div className="q-nav-bar__links">
				{links.map((l) => (
					<NavLink key={l.label} href={l.href} current={l.current}>
						{l.label}
					</NavLink>
				))}
			</div>
			<Button size="sm" arrow href={onCta ? undefined : ctaHref} onClick={onCta}>
				{cta}
			</Button>
		</nav>
	);
}
