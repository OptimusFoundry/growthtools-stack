import type { ReactNode } from "react";
import styles from "./MobileActionBar.module.scss";

export interface MobileActionBarProps {
	/** The primary CTA — always visible, rendered right-most. */
	primary: ReactNode;
	/** Secondary action — rendered left of primary. */
	secondary?: ReactNode;
	/**
	 * Overflow trigger — rendered left of secondary.
	 * Intended for a DropdownMenu trigger button that opens a menu with
	 * less-frequent actions (e.g. Delete, Save draft).
	 */
	overflow?: ReactNode;
}

/**
 * Sticky bottom action bar for mobile viewports (<768px).
 * Hidden on desktop via CSS — render it unconditionally alongside the
 * desktop Topbar actions; CSS controls visibility. No JS media query needed.
 */
export function MobileActionBar({
	primary,
	secondary,
	overflow,
}: MobileActionBarProps) {
	return (
		<div className={styles.bar} role="toolbar" aria-label="Post actions">
			<div className={styles.start}>
				{overflow}
				{secondary}
			</div>
			<div className={styles.end}>{primary}</div>
		</div>
	);
}
