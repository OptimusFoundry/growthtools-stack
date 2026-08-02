// Shared sm/md/lg segmented control used by the Size Lab and the Patterns
// chapter to drive a section's rendered size. Showcase-only.

import styles from "./SizeToggle.module.scss";

export type LabSize = "sm" | "md" | "lg";

const SIZES: LabSize[] = ["sm", "md", "lg"];

interface SizeToggleProps {
	value: LabSize;
	onChange: (size: LabSize) => void;
	ariaLabel?: string;
}

export function SizeToggle({
	value,
	onChange,
	ariaLabel = "Size",
}: SizeToggleProps) {
	return (
		<div className={styles.toggle} role="radiogroup" aria-label={ariaLabel}>
			{SIZES.map((s) => (
				<button
					key={s}
					type="button"
					role="radio"
					aria-checked={s === value}
					className={styles.toggleBtn}
					data-active={s === value || undefined}
					onClick={() => onChange(s)}
				>
					{s}
				</button>
			))}
		</div>
	);
}
