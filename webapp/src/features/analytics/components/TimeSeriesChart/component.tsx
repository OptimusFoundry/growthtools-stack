import { memo, useMemo } from "react";
import {
	Area,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { TimeSeriesDataPoint } from "@/types/analytics";
import {
	getChartColors,
	gridProps,
	xAxisProps,
	yAxisProps,
} from "../chart-theme";
import styles from "./component.module.scss";

export type MetricKey = "impressions" | "likes" | "comments" | "shares";

interface TimeSeriesChartProps {
	data: TimeSeriesDataPoint[];
	metric: MetricKey;
}

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div className={styles.tooltip}>
			<span className={styles.tooltipDate}>{label}</span>
			<span className={styles.tooltipValue}>
				{payload[0].value.toLocaleString()}
			</span>
		</div>
	);
}

export const TimeSeriesChart = memo(function TimeSeriesChart({
	data,
	metric,
}: TimeSeriesChartProps) {
	const colors = useMemo(() => getChartColors(), []);

	const chartData = useMemo(
		() => data.map((d) => ({ date: d.date.slice(0, 10), value: d[metric] })),
		[data, metric],
	);

	const gradId = `tsc-area-${metric}`;

	return (
		<ResponsiveContainer width="100%" height={280}>
			<LineChart
				data={chartData}
				margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
			>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={colors.primary} stopOpacity={0.08} />
						<stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid {...gridProps} />
				<XAxis dataKey="date" {...xAxisProps} />
				<YAxis {...yAxisProps} />
				<Tooltip content={<CustomTooltip />} />
				<Area
					type="monotone"
					dataKey="value"
					stroke="none"
					fill={`url(#${gradId})`}
					isAnimationActive={false}
				/>
				<Line
					type="monotone"
					dataKey="value"
					stroke={colors.primary}
					strokeWidth={2}
					dot={false}
					isAnimationActive={false}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
});

TimeSeriesChart.displayName = "TimeSeriesChart";
