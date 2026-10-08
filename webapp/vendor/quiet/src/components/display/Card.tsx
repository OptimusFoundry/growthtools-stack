import type React from "react";
import { useLinkElement } from "../../lib/link";
import "./Card.scss";

/**
 * Rounded hairline container (--radius-lg). When interactive, hover lifts to --shadow-2 and the border goes --rule-strong.
 * @startingPoint section="Display" subtitle="Hairline work card" viewport="700x320"
 */
export interface CardProps {
	eyebrow?: React.ReactNode;
	title?: React.ReactNode;
	/** Italic phrase after the title, e.g. "iOS" in "Anvil iOS" */
	accent?: React.ReactNode;
	children?: React.ReactNode;
	/** Mono metadata in the footer row */
	meta?: React.ReactNode;
	/** Right side of footer row (e.g. an arrow) */
	footer?: React.ReactNode;
	href?: string;
	/** Also called on Enter/Space when the card acts as a button */
	onClick?: (event: React.SyntheticEvent<HTMLElement>) => void;
	className?: string;
	style?: React.CSSProperties;
}

export function Card({
	eyebrow,
	title,
	accent,
	children,
	meta,
	footer,
	href,
	onClick,
	className,
	style,
}: CardProps) {
	const interactive = !!(href || onClick);
	const A = useLinkElement(href);
	const El: React.ElementType = href ? A : "div";
	return (
		<El
			href={href}
			onClick={onClick}
			{...(!href && onClick
				? {
						role: "button",
						tabIndex: 0,
						onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
							if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
								e.preventDefault();
								onClick!(e);
							}
						},
					}
				: {})}
			className={["q-card", interactive && "q-card--interactive", className]
				.filter(Boolean)
				.join(" ")}
			style={style}
		>
			{eyebrow && <div className="q-card__eyebrow">{eyebrow}</div>}
			{title && (
				<div className="q-card__title">
					{title}
					{accent && (
						<>
							{" "}
							<em className="q-card__accent">{accent}</em>
						</>
					)}
				</div>
			)}
			{children && <div className="q-card__body">{children}</div>}
			{(meta || footer) && (
				<div className="q-card__footer">
					{meta && <div className="q-card__meta">{meta}</div>}
					{footer}
				</div>
			)}
		</El>
	);
}
