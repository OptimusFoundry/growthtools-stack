import type React from "react";
import { Eyebrow } from "../core/Eyebrow";
import { Headline } from "../core/Headline";
import "./PageHero.scss";

/**
 * Top-of-page title block: eyebrow, headline with italic accent and molten period, intro, actions.
 * @startingPoint section="Layout" subtitle="Page title blocks" viewport="900x360"
 */
export interface PageHeroProps {
	/** Ink serial before the eyebrow, e.g. "02" */
	index?: React.ReactNode;
	eyebrow?: React.ReactNode;
	title: React.ReactNode;
	accent?: React.ReactNode;
	after?: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	/** lg = marketing/section pages · md = app pages */
	size?: "lg" | "md";
	/** Soft rule under the hero */
	ruled?: boolean;
	/** Heading level of the title; default h1 */
	as?: "h1" | "h2" | "h3";
	className?: string;
	style?: React.CSSProperties;
}

// Headline only takes `style`, so the md title's type scale goes in as token references.

export function PageHero({
	index,
	eyebrow,
	title,
	accent,
	after,
	description,
	actions,
	size = "lg",
	ruled = true,
	as = "h1",
	className,
	style,
}: PageHeroProps) {
	const lg = size === "lg";
	const cls = [
		"q-page-hero",
		`q-page-hero--${lg ? "lg" : "md"}`,
		ruled && "q-page-hero--ruled",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<header className={cls} style={style}>
			{(eyebrow || index) && <Eyebrow index={index as string | undefined}>{eyebrow}</Eyebrow>}
			<Headline
				size={lg ? "h2" : "h3"}
				as={as}
				lead={title}
				accent={accent}
				after={after}
				className={lg ? "q-page-hero__title" : "q-page-hero__title q-page-hero__title--md"}
			/>
			{description && <p className="q-page-hero__description">{description}</p>}
			{actions && <div className="q-page-hero__actions">{actions}</div>}
		</header>
	);
}
