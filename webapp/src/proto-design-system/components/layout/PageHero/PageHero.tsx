import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./PageHero.module.scss";

export interface PageHeroProps {
	/** Small mono label above the title (e.g. "Campaigns · 04 total"). */
	eyebrow?: ReactNode;
	/** Main page heading. Accepts JSX so callers can inline `<em>` or `<br/>` accents. */
	title: ReactNode;
	/** Sublede paragraph shown below the title. */
	description?: ReactNode;
	/** Right-aligned action slot (usually a Button). */
	actions?: ReactNode;
	/** Additional className on the root `<header>`. */
	className?: string;
	/** Inline styles — useful for ad-hoc token overrides. */
	style?: CSSProperties;
}

/**
 * Page-level hero header: eyebrow, title, description, and action slot.
 * Styling is driven by `--page-hero-*` CSS custom properties (see PageHero.module.scss)
 * so pages/themes can override sizing without changing markup.
 */
export function PageHero({
	eyebrow,
	title,
	description,
	actions,
	className,
	style,
}: PageHeroProps) {
	return (
		<header className={cn(styles.hero, className)} style={style}>
			<div className={styles.text}>
				{eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
				<h1 className={styles.title}>{title}</h1>
				{description ? (
					<p className={styles.description}>{description}</p>
				) : null}
			</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</header>
	);
}

PageHero.displayName = "PageHero";
