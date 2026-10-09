import { LineChart } from "@optimusfoundry/quiet";
import { memo, useMemo } from "react";
import type { TimeSeriesDataPoint } from "@/types/analytics";

export type MetricKey = "impressions" | "likes" | "comments" | "shares";

interface TimeSeriesChartProps {
	data: TimeSeriesDataPoint[];
	metric: MetricKey;
}

const METRIC_LABEL: Record<MetricKey, string> = {
	impressions: "Impressions",
	likes: "Likes",
	comments: "Comments",
	shares: "Shares",
};

// Daily buckets are UTC midnights; local formatting would shift the label a day west of UTC.
function formatDay(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

export const TimeSeriesChart = memo(function TimeSeriesChart({
	data,
	metric,
}: TimeSeriesChartProps) {
	const label = METRIC_LABEL[metric];
	const labels = useMemo(() => data.map((d) => d.date.slice(0, 10)), [data]);
	const values = useMemo(() => data.map((d) => d[metric]), [data, metric]);

	return (
		<LineChart
			series={[{ name: label, data: values }]}
			labels={labels}
			formatLabel={formatDay}
			formatValue={(v) => v.toLocaleString()}
			area
			height={280}
			aria-label={`${label} over time`}
		/>
	);
});

TimeSeriesChart.displayName = "TimeSeriesChart";
