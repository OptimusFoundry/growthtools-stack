import { LineChart } from "@optimusfoundry/quiet";
import { memo, useMemo } from "react";
import styles from "./component.module.scss";

export interface EngagementPoint {
	collectedAt: string;
	value: number;
}

interface EngagementTimelineChartProps {
	data: EngagementPoint[];
	height?: number;
	ariaLabel: string;
	emptyLabel?: string;
}

function formatTick(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

// LineChart has no allowDecimals, so round here to avoid fractional ticks on small counts.
function formatValue(n: number): string {
	const rounded = Math.round(n);
	if (rounded >= 1_000_000) return `${(rounded / 1_000_000).toFixed(1)}M`;
	if (rounded >= 1_000) return `${(rounded / 1_000).toFixed(1)}K`;
	return rounded.toLocaleString();
}

/**
 * Always reserves the chart frame and overlays a label when there are fewer
 * than 2 points, so the card's geometry stays stable as hourly snapshots
 * accumulate.
 */
export const EngagementTimelineChart = memo(function EngagementTimelineChart({
	data,
	height = 140,
	ariaLabel,
	emptyLabel = "Not enough data yet — metrics appear after the next collection.",
}: EngagementTimelineChartProps) {
	const hasLine = data.length >= 2;
	const labels = useMemo(() => data.map((d) => d.collectedAt), [data]);
	const series = useMemo(
		() => [{ name: "Engagement", data: data.map((d) => d.value) }],
		[data],
	);

	return (
		<div className={styles.wrapper}>
			<LineChart
				series={series}
				labels={labels}
				formatLabel={formatTick}
				formatValue={formatValue}
				height={height}
				aria-label={ariaLabel}
			/>
			{!hasLine && <span className={styles.emptyLabel}>{emptyLabel}</span>}
		</div>
	);
});

EngagementTimelineChart.displayName = "EngagementTimelineChart";
