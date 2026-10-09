import { FilterTabs } from "@optimusfoundry/quiet";
import type { MetricKey } from "../TimeSeriesChart/component";

interface MetricSelectorProps {
	value: MetricKey;
	onChange: (metric: MetricKey) => void;
}

const METRICS = [
	{ value: "impressions", label: "Impressions" },
	{ value: "likes", label: "Likes" },
	{ value: "comments", label: "Comments" },
	{ value: "shares", label: "Shares" },
];

function isMetricKey(value: string): value is MetricKey {
	return METRICS.some((metric) => metric.value === value);
}

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
	return (
		<FilterTabs
			size="sm"
			showCounts={false}
			label="Select metric"
			items={METRICS}
			value={value}
			onChange={(next) => {
				if (isMetricKey(next)) onChange(next);
			}}
		/>
	);
}
