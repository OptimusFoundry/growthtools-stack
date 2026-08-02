// Shared specimen framework for the UI Kit catalog. A <Spec> is one component's
// "frame" (name + description + body); <SpecRow> groups one variant axis
// (variants / sizes / states) with an optional label; <SpecItem> is a single
// labeled demo cell. Showcase-only — imported by specimen files under
// showcase/specimens/, which the story imports, so it's tree-shaken from the app.

import type { ReactNode } from "react";
import styles from "./Spec.module.scss";

interface SpecProps {
	name: string;
	description?: string;
	children: ReactNode;
}

export function Spec({ name, description, children }: SpecProps) {
	return (
		<article className={styles.spec}>
			<header className={styles.head}>
				<h4 className={styles.name}>{name}</h4>
				{description ? (
					<p className={styles.description}>{description}</p>
				) : null}
			</header>
			<div className={styles.body}>{children}</div>
		</article>
	);
}

interface SpecRowProps {
	label?: string;
	/** Stack items in a column instead of a wrapping row (for wide demos). */
	column?: boolean;
	children: ReactNode;
}

export function SpecRow({ label, column, children }: SpecRowProps) {
	return (
		<div className={styles.row}>
			{label ? <span className={styles.rowLabel}>{label}</span> : null}
			<div className={styles.items} data-column={column || undefined}>
				{children}
			</div>
		</div>
	);
}

interface SpecItemProps {
	label?: string;
	/** Let the demo take available width (for inputs, tables, etc.). */
	grow?: boolean;
	children: ReactNode;
}

export function SpecItem({ label, grow, children }: SpecItemProps) {
	return (
		<div className={styles.item} data-grow={grow || undefined}>
			<div className={styles.demo}>{children}</div>
			{label ? <span className={styles.itemLabel}>{label}</span> : null}
		</div>
	);
}
