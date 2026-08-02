import type { ElementType, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./SectionHeader.module.scss";

export interface SectionHeaderProps {
	/** Mono uppercase label above the title — e.g. "CAMPAIGNS · 4 TOTAL". */
	eyebrow?: string;
	/** Section heading text. Rendered as an `<h2>` by default. */
	title: string;
	/** Optional description line below the title. Max 62ch. */
	description?: string;
	/** Right-aligned action slot — usually a Button or Dropdown. */
	actions?: ReactNode;
	/**
	 * Size variant.
	 * - `"md"` (default) — title at `--font-size-md` (16px)
	 * - `"sm"` — title drops to `--font-size-base` (15px)
	 */
	size?: "sm" | "md";
	/**
	 * Override the rendered heading element.
	 * Defaults to `"h2"`. Pass `"h3"` when this section head lives inside an
	 * existing `<h2>` section, etc.
	 */
	as?: ElementType;
	/** Additional class name on the root element. */
	className?: string;
}

/**
 * SectionHeader — canonical eyebrow + title + description + actions block
 * for sub-page sections.
 *
 * Extracted from the dashboard's `.sectionEyebrow` / `.sectionTitle` rhythm.
 * Replaces every hand-rolled `SectionHead` sub-component across feature files.
 *
 * Token-driven: no `clamp()`, no `px`, no Fraunces fallbacks.
 */
export function SectionHeader({
	eyebrow,
	title,
	description,
	actions,
	size = "md",
	as: Heading = "h2",
	className,
}: SectionHeaderProps) {
	const hasActions = actions != null;

	return (
		<header
			className={cn(
				styles.root,
				size === "sm" && styles.sizeSm,
				hasActions && styles.withActions,
				className,
			)}
		>
			<div className={styles.text}>
				{eyebrow ? (
					<span className={styles.eyebrow} aria-hidden="true">
						{eyebrow}
					</span>
				) : null}
				<Heading className={styles.title}>{title}</Heading>
				{description ? (
					<p className={styles.description}>{description}</p>
				) : null}
			</div>
			{hasActions ? <div className={styles.actions}>{actions}</div> : null}
		</header>
	);
}

SectionHeader.displayName = "SectionHeader";
