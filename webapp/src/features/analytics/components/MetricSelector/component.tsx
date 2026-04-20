import type { MetricKey } from "../TimeSeriesChart/component";
import styles from "./component.module.scss";

interface MetricSelectorProps {
	value: MetricKey;
	onChange: (metric: MetricKey) => void;
}

const METRICS: { key: MetricKey; label: string }[] = [
	{ key: "impressions", label: "Impressions" },
	{ key: "likes", label: "Likes" },
	{ key: "comments", label: "Comments" },
	{ key: "shares", label: "Shares" },
];

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
	return (
		<div className={styles.root} role="tablist" aria-label="Select metric">
			{METRICS.map(({ key, label }) => (
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
