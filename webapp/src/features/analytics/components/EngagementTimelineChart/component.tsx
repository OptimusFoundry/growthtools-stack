import { memo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { gridProps, xAxisProps, yAxisProps } from "../chart-theme";
import styles from "./component.module.scss";

export interface EngagementPoint {
	collectedAt: string;
	value: number;
}

interface EngagementTimelineChartProps {
	data: EngagementPoint[];
	stroke: string;
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

function formatValue(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

/**
 * Small line chart with x/y axes for per-post engagement history. Unlike a
 * Sparkline, this always reserves space for axes and renders a placeholder
 * frame when data is insufficient (< 2 points), so the card's geometry stays
 * stable as the hourly pipeline collects more snapshots.
 */
export const EngagementTimelineChart = memo(function EngagementTimelineChart({
	data,
	stroke,
	height = 140,
	ariaLabel,
	emptyLabel = "Not enough data yet — metrics appear after the next collection.",
}: EngagementTimelineChartProps) {
	const hasLine = data.length >= 2;

	return (
		<div
			className={styles.wrapper}
			style={{ height }}
			role="img"
			aria-label={ariaLabel}
		>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
				>
					<CartesianGrid {...gridProps} />
					<XAxis
						{...xAxisProps}
						dataKey="collectedAt"
						tickFormatter={formatTick}
						minTickGap={32}
					/>
					<YAxis
						{...yAxisProps}
						tickFormatter={formatValue}
						allowDecimals={false}
					/>
					{hasLine && (
						<Line
							type="monotone"
							dataKey="value"
							stroke={stroke}
							strokeWidth={1.5}
							dot={false}
							isAnimationActive={false}
						/>
					)}
				</LineChart>
			</ResponsiveContainer>
			{!hasLine && <span className={styles.emptyLabel}>{emptyLabel}</span>}
		</div>
	);
});

EngagementTimelineChart.displayName = "EngagementTimelineChart";
