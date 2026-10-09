import {
	Alert,
	Button,
	Col,
	EmptyState,
	Grid,
	PageHero,
	SectionHeader,
	Skeleton,
	Stack,
	StatCard,
	Table,
	type TableProps,
	Text,
} from "@optimusfoundry/quiet";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
	BarChart2,
	Eye,
	Heart,
	MessageCircle,
	RefreshCw,
	Share2,
} from "lucide-react";
import { memo, type ReactNode, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import type { RangeKey } from "@/hooks/useAnalytics";
import {
	type AnalyticsDeltas,
	useAnalyticsComparison,
} from "@/hooks/useAnalyticsComparison";
import type { AnalyticsOverview, PlatformBreakdown } from "@/types/analytics";
import type { PlatformType } from "@/types/platform";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import { formatDelta, formatNumber, trendOf } from "@/utils/format";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import { DateRangeTabs } from "../DateRangeTabs/component";
import { MetricSelector } from "../MetricSelector/component";
import type { MetricKey } from "../TimeSeriesChart/component";
import { TimeSeriesChart } from "../TimeSeriesChart/component";
import styles from "./component.module.scss";

const VALID_RANGES: RangeKey[] = ["7d", "30d", "90d"];

const RANGE_LABEL: Record<RangeKey, string> = {
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	"90d": "Last 90 days",
};

interface KpiConfig {
	key: MetricKey;
	label: string;
	icon: typeof Eye;
	total: (overview: AnalyticsOverview) => number;
}

const KPIS: KpiConfig[] = [
	{
		key: "impressions",
		label: "Impressions",
		icon: Eye,
		total: (o) => o.totalImpressions,
	},
	{ key: "likes", label: "Likes", icon: Heart, total: (o) => o.totalLikes },
	{
		key: "comments",
		label: "Comments",
		icon: MessageCircle,
		total: (o) => o.totalComments,
	},
	{ key: "shares", label: "Shares", icon: Share2, total: (o) => o.totalShares },
];

function getPlatformLabel(platform: string): string {
	return PLATFORM_DISPLAY_NAMES[platform as PlatformType] ?? platform;
}

function formatStat(value: number | string): string {
	return formatNumber(Number(value));
}

function formatCount(value: number): string {
	return value.toLocaleString();
}

const platformColumns: TableProps<PlatformBreakdown>["columns"] = [
	{
		key: "platform",
		header: "Platform",
		render: (row) => getPlatformLabel(row.platform),
	},
	{
		key: "impressions",
		header: "Impressions",
		align: "right",
		render: (row) => formatCount(row.impressions),
	},
	{
		key: "likes",
		header: "Likes",
		align: "right",
		render: (row) => formatCount(row.likes),
	},
	{
		key: "comments",
		header: "Comments",
		align: "right",
		render: (row) => formatCount(row.comments),
	},
	{
		key: "shares",
		header: "Shares",
		align: "right",
		render: (row) => formatCount(row.shares),
	},
	{
		key: "clicks",
		header: "Clicks",
		align: "right",
		render: (row) => formatCount(row.clicks),
	},
];

function eyebrowFor(range: RangeKey, platformCount: number | null): string {
	if (platformCount === null) return `PERFORMANCE · ${RANGE_LABEL[range]}`;
	const noun = platformCount === 1 ? "platform" : "platforms";
	return `PERFORMANCE · ${RANGE_LABEL[range]} · ${platformCount} ${noun}`;
}

interface AnalyticsShellProps {
	range: RangeKey;
	platformCount: number | null;
	onRangeChange: (next: RangeKey) => void;
	children: ReactNode;
}

function AnalyticsShell({
	range,
	platformCount,
	onRangeChange,
	children,
}: AnalyticsShellProps) {
	return (
		<>
			<Topbar title="Analytics" />
			<Stack gap="lg" animated>
				<PageHero
					size="md"
					as="h2"
					ruled={false}
					className={styles.hero}
					eyebrow={eyebrowFor(range, platformCount)}
					title="The numbers,"
					accent="without the noise"
					description="Impressions, engagement, and reach across every connected platform — at a glance."
					actions={<DateRangeTabs value={range} onChange={onRangeChange} />}
				/>
				{children}
			</Stack>
		</>
	);
}

function LoadingBody() {
	return (
		<>
			<Grid columns={12} gap="md" rowGap="md">
				{KPIS.map((kpi) => (
					<Col key={kpi.key} span={3}>
						<Skeleton variant="rounded" height={120} />
					</Col>
				))}
			</Grid>
			<Skeleton variant="rounded" height={280} />
		</>
	);
}

function KpiRow({
	overview,
	deltas,
}: {
	overview: AnalyticsOverview;
	deltas: AnalyticsDeltas | null;
}) {
	return (
		<Grid columns={12} gap="md" rowGap="md">
			{KPIS.map((kpi) => {
				const delta = deltas ? formatDelta(deltas[kpi.key]) : undefined;
				return (
					<Col key={kpi.key} span={3}>
						<StatCard
							label={kpi.label}
							value={kpi.total(overview)}
							format={formatStat}
							icon={<AppIcon icon={kpi.icon} size="lg" />}
							delta={delta}
							trend={delta ? trendOf(delta) : undefined}
							period={delta ? "vs prior period" : undefined}
						/>
					</Col>
				);
			})}
		</Grid>
	);
}

export const AnalyticsPage = memo(function AnalyticsPage() {
	// Range synced to ?range= search param. Default 30d (omits param).
	const search = useSearch({ from: "/analytics" }) as { range?: string };
	const navigate = useNavigate();
	const range: RangeKey = VALID_RANGES.includes(search.range as RangeKey)
		? (search.range as RangeKey)
		: "30d";

	const [metric, setMetric] = useState<MetricKey>("impressions");

	const { current, deltas } = useAnalyticsComparison(range);
	const { overview, timeseries, platformBreakdown, loading, error, refetch } =
		current;

	function handleRangeChange(next: RangeKey) {
		navigate({
			to: "/analytics",
			search: next === "30d" ? {} : { range: next },
			replace: true,
		});
	}

	function renderShell(platformCount: number | null, body: ReactNode) {
		return (
			<AnalyticsShell
				range={range}
				platformCount={platformCount}
				onRangeChange={handleRangeChange}
			>
				{body}
			</AnalyticsShell>
		);
	}

	if (loading) return renderShell(null, <LoadingBody />);

	if (error) {
		return renderShell(
			null,
			<Alert
				variant="error"
				title="Something went wrong"
				action={
					<Button
						variant="secondary"
						size="sm"
						icon={<AppIcon icon={RefreshCw} />}
						onClick={refetch}
					>
						Retry
					</Button>
				}
			>
				{error}
			</Alert>,
		);
	}

	const isNoPlatforms =
		platformBreakdown.length === 0 &&
		overview !== null &&
		overview.totalImpressions === 0 &&
		overview.totalLikes === 0;

	if (!overview || isNoPlatforms) {
		return renderShell(
			0,
			<EmptyState
				icon={<AppIcon icon={BarChart2} size="xl" />}
				title={trimTrailingPeriod("No platforms connected")}
				description="Connect your social platforms and start publishing to see analytics here."
				actions={
					<Button variant="primary" href="/account?tab=platforms">
						Connect platforms
					</Button>
				}
			/>,
		);
	}

	if (timeseries.length === 0 && platformBreakdown.length === 0) {
		return renderShell(
			platformBreakdown.length,
			<EmptyState
				icon={<AppIcon icon={BarChart2} size="xl" />}
				title={trimTrailingPeriod("No data for this range")}
				description="There is no activity recorded in this time window."
				actions={
					<Button variant="ghost" onClick={() => handleRangeChange("30d")}>
						Switch to 30 days
					</Button>
				}
			/>,
		);
	}

	return renderShell(
		platformBreakdown.length,
		<>
			<KpiRow overview={overview} deltas={deltas} />

			{timeseries.length > 0 && (
				<section className={styles.panel}>
					<Stack gap="lg">
						<Stack
							direction="row"
							justify="space-between"
							align="center"
							wrap
							gap="sm"
						>
							<Text as="h3" size="lg" weight="semibold">
								Engagement over time
							</Text>
							<MetricSelector value={metric} onChange={setMetric} />
						</Stack>
						<TimeSeriesChart data={timeseries} metric={metric} />
					</Stack>
				</section>
			)}

			{platformBreakdown.length > 0 && (
				<Stack gap="md">
					<SectionHeader size="sm" as="h2" title="Platform Breakdown" />
					<Table
						label="Platform breakdown"
						size="sm"
						rowKey="platform"
						columns={platformColumns}
						data={platformBreakdown}
					/>
				</Stack>
			)}
		</>,
	);
});

AnalyticsPage.displayName = "AnalyticsPage";
