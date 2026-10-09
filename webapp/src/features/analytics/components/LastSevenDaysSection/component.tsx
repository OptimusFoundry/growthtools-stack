import {
	ArrowLink,
	Col,
	Grid,
	SectionHeader,
	Skeleton,
	Sparkline,
	Stack,
	StatCard,
} from "@optimusfoundry/quiet";
import { useAnalyticsComparison } from "@/hooks/useAnalyticsComparison";
import { formatDelta, formatNumber, trendOf } from "@/utils/format";

const SPARKLINE_WIDTH = 240;
const SPARKLINE_HEIGHT = 48;

function formatStat(value: number | string): string {
	return formatNumber(Number(value));
}

function SectionHead({ withLink }: { withLink: boolean }) {
	return (
		<SectionHeader
			size="sm"
			as="h2"
			eyebrow="LAST 7 DAYS · PERFORMANCE"
			title="Momentum"
			accent="at a glance"
			actions={
				withLink ? (
					<ArrowLink href="/analytics?range=7d">View analytics</ArrowLink>
				) : undefined
			}
		/>
	);
}

export function LastSevenDaysSection() {
	const { current, deltas } = useAnalyticsComparison("7d");
	const { overview, timeseries, loading, error } = current;

	// Silently hide on error — dashboard should never break for this widget.
	if (error) return null;

	// Hide when all data is zero (permanently-empty pattern).
	if (
		!loading &&
		overview &&
		overview.totalImpressions === 0 &&
		overview.totalLikes === 0
	) {
		return null;
	}

	if (loading) {
		return (
			<Stack gap="md">
				<SectionHead withLink={false} />
				<Grid columns={12} gap="md" rowGap="md">
					<Col span={6}>
						<Skeleton variant="rounded" height={120} />
					</Col>
					<Col span={6}>
						<Skeleton variant="rounded" height={120} />
					</Col>
				</Grid>
			</Stack>
		);
	}

	if (!overview) return null;

	const engagements =
		overview.totalLikes + overview.totalComments + overview.totalShares;

	const impressionSpark = timeseries.map((d) => d.impressions);
	const engagementSpark = timeseries.map(
		(d) => d.likes + d.comments + d.shares,
	);

	const impressionsDelta = deltas ? formatDelta(deltas.impressions) : undefined;
	const engagementsDelta = deltas
		? formatDelta(deltas.likes + deltas.comments + deltas.shares)
		: undefined;

	return (
		<Stack gap="md">
			<SectionHead withLink />
			<Grid columns={12} gap="md" rowGap="md">
				<Col span={6}>
					<Stack gap="sm">
						<StatCard
							label="Impressions"
							value={overview.totalImpressions}
							format={formatStat}
							delta={impressionsDelta}
							trend={impressionsDelta ? trendOf(impressionsDelta) : undefined}
							period={impressionsDelta ? "vs prior 7d" : undefined}
						/>
						{impressionSpark.length > 0 && (
							<Sparkline
								data={impressionSpark}
								tone="accent"
								area
								width={SPARKLINE_WIDTH}
								height={SPARKLINE_HEIGHT}
								aria-label="Impressions sparkline for last 7 days"
							/>
						)}
					</Stack>
				</Col>
				<Col span={6}>
					<Stack gap="sm">
						<StatCard
							label="Engagements"
							value={engagements}
							format={formatStat}
							delta={engagementsDelta}
							trend={engagementsDelta ? trendOf(engagementsDelta) : undefined}
							period={engagementsDelta ? "vs prior 7d" : undefined}
						/>
						{engagementSpark.length > 0 && (
							<Sparkline
								data={engagementSpark}
								tone="ink"
								area
								width={SPARKLINE_WIDTH}
								height={SPARKLINE_HEIGHT}
								aria-label="Engagements sparkline for last 7 days"
							/>
						)}
					</Stack>
				</Col>
			</Grid>
		</Stack>
	);
}
