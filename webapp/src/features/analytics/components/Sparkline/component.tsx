import { memo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export interface SparklinePoint {
	value: number;
}

interface SparklineProps {
	data: SparklinePoint[];
	stroke: string;
	height?: number;
	ariaLabel: string;
}

export const Sparkline = memo(function Sparkline({
	data,
	stroke,
	height = 60,
	ariaLabel,
}: SparklineProps) {
	if (data.length === 0) {
		return <div style={{ height }} aria-label={ariaLabel} />;
	}
	const gradId = `sg-${stroke.replace(/[^a-z0-9]/gi, "")}`;
	return (
		<ResponsiveContainer width="100%" height={height} aria-label={ariaLabel}>
			<AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={stroke} stopOpacity={0.15} />
						<stop offset="95%" stopColor={stroke} stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area
					type="monotone"
					dataKey="value"
					stroke={stroke}
					strokeWidth={1.5}
					fill={`url(#${gradId})`}
					dot={false}
					isAnimationActive={false}
				/>
				<Tooltip contentStyle={{ display: "none" }} cursor={false} />
			</AreaChart>
		</ResponsiveContainer>
	);
});

Sparkline.displayName = "Sparkline";
