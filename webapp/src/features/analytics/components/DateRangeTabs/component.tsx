import type { RangeKey } from "@/hooks/useAnalytics";
import styles from "./component.module.scss";

interface DateRangeTabsProps {
	value: RangeKey;
	onChange: (range: RangeKey) => void;
}

const RANGES: { key: RangeKey; label: string }[] = [
	{ key: "7d", label: "7 days" },
	{ key: "30d", label: "30 days" },
	{ key: "90d", label: "90 days" },
];

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
	return (
		<div className={styles.root} role="tablist" aria-label="Date range">
			{RANGES.map(({ key, label }) => (
				<button
					key={key}
					type="button"
					role="tab"
					aria-selected={value === key}
					className={`${styles.tab} ${value === key ? styles.active : ""}`}
					onClick={() => onChange(key)}
				>
					{label}
				</button>
			))}
		</div>
	);
}
