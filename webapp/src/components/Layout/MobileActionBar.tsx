import type { ReactNode } from "react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import styles from "./MobileActionBar.module.scss";

export interface MobileActionBarProps {
	/** Buttons grouped at the start (left) — typically ghost/tertiary actions. */
	start?: ReactNode;
	/** Buttons grouped at the end (right) — typically secondary + primary CTA. */
	end?: ReactNode;
}

/**
 * Fixed bottom action bar for narrow viewports (<1024px).
 * Hidden on desktop via CSS — render it unconditionally; CSS controls
 * visibility. No JS media query needed.
 */
export function MobileActionBar({ start, end }: MobileActionBarProps) {
	return (
		<div className={styles.bar} role="toolbar" aria-label="Post actions">
			<Stack direction="row" gap="xs" align="center">
				{start}
			</Stack>
			<Stack direction="row" gap="sm" align="center">
				{end}
			</Stack>
		</div>
	);
}
