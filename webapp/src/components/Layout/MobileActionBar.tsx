import type { ReactNode } from "react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import styles from "./MobileActionBar.module.scss";

export interface MobileActionBarProps {
	/**
	 * Action buttons — up to four icon-only buttons, spaced evenly.
	 * Rightmost is typically the primary CTA. Callers own icon + aria-label.
	 */
	children: ReactNode;
}

/**
 * Fixed bottom action bar for mobile viewports (<768px).
 * Hidden on desktop via CSS — render it unconditionally alongside the
 * desktop Topbar actions; CSS controls visibility. No JS media query needed.
 */
export function MobileActionBar({ children }: MobileActionBarProps) {
	return (
		<div className={styles.bar} role="toolbar" aria-label="Post actions">
			<Stack direction="row" gap="sm" align="center" justify="between">
				{children}
			</Stack>
		</div>
	);
}
