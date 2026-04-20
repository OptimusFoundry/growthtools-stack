/**
 * AnalyticsPage — enhanced with date-range tabs, trend chips, time-series
 * chart, and .tbl-style platform breakdown table.
 */

import { useNavigate, useSearch } from "@tanstack/react-router";
import {
	BarChart2,
	Eye,
	Heart,
	MessageCircle,
	RefreshCw,
	Share2,
} from "lucide-react";
import { memo, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import type { RangeKey } from "@/hooks/useAnalytics";
import { useAnalyticsComparison } from "@/hooks/useAnalyticsComparison";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { StatCard } from "@/proto-design-system/components/data/StatCard";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Text } from "@/proto-design-system/components/primitives/Text";
import pageStyles from "@/routes/page.module.scss";
import type { PlatformType } from "@/types/platform";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import { DateRangeTabs } from "../DateRangeTabs/component";
import { MetricSelector } from "../MetricSelector/component";
import type { MetricKey } from "../TimeSeriesChart/component";
import { TimeSeriesChart } from "../TimeSeriesChart/component";
import styles from "./component.module.scss";

function formatNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toLocaleString();
}

function getPlatformLabel(platform: string): string {
	return PLATFORM_DISPLAY_NAMES[platform as PlatformType] ?? platform;
}

function TrendChip({ delta }: { delta: number | null }) {
	if (delta === null) return null;
	const dir = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
	const label = delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta);
	return (
		<span
			className={`${styles.trendChip} ${styles[`trendChip--${dir}`]}`}
			aria-label={`Trend: ${label}`}
		>
			{label}
		</span>
	);
}

function StatGridSkeleton() {
	return (
		<div className={styles.statsGrid}>
			{[0, 1, 2, 3].map((i) => (
				<div key={i} className={styles.skCard}>
					<Skeleton height={12} width="50%" />
					<Skeleton height={32} width="70%" />
					<Skeleton height={12} width="40%" />
				</div>
			))}
		</div>
	);
}

function ChartSkeleton() {
	return <Skeleton height={280} />;
}

const VALID_RANGES: RangeKey[] = ["7d", "30d", "90d"];

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

	const topbar = <Topbar title="Analytics" />;

	// ── Loading state ──────────────────────────────────────────────────────────
	if (loading) {
		return (
			<>
				{topbar}
				<Stack gap="lg" className={styles.page} animate>
					<header className={pageStyles.pageHero}>
						<div className={pageStyles.pageHeroText}>
							<div className={pageStyles.pageEyebrow}>
								PERFORMANCE · loading
							</div>
							<h1 className={pageStyles.pageHeroTitle}>
								The numbers, <em>without the noise</em>.
							</h1>
						</div>
					</header>
					<DateRangeTabs value={range} onChange={handleRangeChange} />
					<StatGridSkeleton />
					<ChartSkeleton />
				</Stack>
			</>
		);
	}

	// ── Error state ────────────────────────────────────────────────────────────
	if (error) {
		return (
			<>
				{topbar}
				<Stack gap="lg" className={styles.page} animate>
					<Card variant="outlined" padding="lg">
						<Stack gap="md" align="center">
							<Text weight="semibold">Something went wrong</Text>
							<Text color="muted" size="sm">
								{error}
							</Text>
							<Button
								variant="secondary"
								leftIcon={<RefreshCw size={16} />}
								onClick={refetch}
							>
								Retry
							</Button>
						</Stack>
					</Card>
				</Stack>
			</>
		);
	}

	// ── Empty — no connected platforms ────────────────────────────────────────
	const isNoPlatforms =
		platformBreakdown.length === 0 &&
		overview !== null &&
		overview.totalImpressions === 0 &&
		overview.totalLikes === 0;

	if (!overview || isNoPlatforms) {
		return (
			<>
				{topbar}
				<Stack gap="lg" className={styles.page} animate>
					<DateRangeTabs value={range} onChange={handleRangeChange} />
					<EmptyState
						icon={<BarChart2 size={48} />}
						title="No platforms connected"
						description="Connect your social platforms and start publishing to see analytics here."
						action={
							<Button
								variant="primary"
								onClick={() =>
									navigate({ to: "/account", search: { tab: "platforms" } })
								}
							>
								Connect platforms
							</Button>
						}
					/>
				</Stack>
			</>
		);
	}

	// ── Empty — connected but no data in range ────────────────────────────────
	if (timeseries.length === 0 && platformBreakdown.length === 0) {
		return (
			<>
				{topbar}
				<Stack gap="lg" className={styles.page} animate>
					<DateRangeTabs value={range} onChange={handleRangeChange} />
					<EmptyState
						icon={<BarChart2 size={48} />}
						title="No data for this range"
						description="There is no activity recorded in this time window."
						action={
							<Button variant="ghost" onClick={() => handleRangeChange("30d")}>
								Switch to 30 days
							</Button>
						}
					/>
				</Stack>
			</>
		);
	}

	// ── Happy path ─────────────────────────────────────────────────────────────
	return (
		<>
			{topbar}
			<Stack gap="lg" className={styles.page} animate>
				<header className={pageStyles.pageHero}>
					<div className={pageStyles.pageHeroText}>
						<div className={pageStyles.pageEyebrow}>
							PERFORMANCE · {platformBreakdown.length}{" "}
							{platformBreakdown.length === 1 ? "platform" : "platforms"}
						</div>
						<h1 className={pageStyles.pageHeroTitle}>
							The numbers, <em>without the noise</em>.
						</h1>
						<p className={pageStyles.pageHeroSub}>
							Impressions, engagement, and reach across every connected platform
							— at a glance.
						</p>
					</div>
				</header>

				<DateRangeTabs value={range} onChange={handleRangeChange} />

				<div className={styles.statsGrid}>
					<StatCard
						label="Impressions"
						value={formatNumber(overview.totalImpressions)}
						numericValue={overview.totalImpressions}
						formatValue={formatNumber}
						icon={<Eye size={18} />}
						variant="outlined"
						footer={<TrendChip delta={deltas?.impressions ?? null} />}
					/>
					<StatCard
						label="Likes"
						value={formatNumber(overview.totalLikes)}
						numericValue={overview.totalLikes}
						formatValue={formatNumber}
						icon={<Heart size={18} />}
						variant="outlined"
						footer={<TrendChip delta={deltas?.likes ?? null} />}
					/>
					<StatCard
						label="Comments"
						value={formatNumber(overview.totalComments)}
						numericValue={overview.totalComments}
						formatValue={formatNumber}
						icon={<MessageCircle size={18} />}
						variant="outlined"
						footer={<TrendChip delta={deltas?.comments ?? null} />}
					/>
					<StatCard
						label="Shares"
						value={formatNumber(overview.totalShares)}
						numericValue={overview.totalShares}
						formatValue={formatNumber}
						icon={<Share2 size={18} />}
						variant="outlined"
						footer={<TrendChip delta={deltas?.shares ?? null} />}
					/>
				</div>

				{timeseries.length > 0 && (
					<Card variant="outlined" padding="md">
						<Stack gap="md">
							<Stack direction="row" justify="between" align="center">
								<span className={styles.chartEyebrow}>
									ENGAGEMENT OVER TIME
								</span>
								<MetricSelector value={metric} onChange={setMetric} />
							</Stack>
							<TimeSeriesChart data={timeseries} metric={metric} />
						</Stack>
					</Card>
				)}

				{platformBreakdown.length > 0 && (
					<Card variant="outlined" padding="md">
						<Stack gap="md">
							<Text as="h3" size="lg" weight="semibold">
								Platform Breakdown
							</Text>
							<div className={styles.tableWrapper}>
								<table className={styles.tbl}>
									<thead>
										<tr>
											<th>Platform</th>
											<th>Impressions</th>
											<th>Likes</th>
											<th>Comments</th>
											<th>Shares</th>
											<th>Clicks</th>
										</tr>
									</thead>
									<tbody>
										{platformBreakdown.map((row) => (
											<tr key={row.platform}>
												<td>{getPlatformLabel(row.platform)}</td>
												<td>{row.impressions.toLocaleString()}</td>
												<td>{row.likes.toLocaleString()}</td>
												<td>{row.comments.toLocaleString()}</td>
												<td>{row.shares.toLocaleString()}</td>
												<td>{row.clicks.toLocaleString()}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Stack>
					</Card>
				)}
			</Stack>
		</>
	);
});

AnalyticsPage.displayName = "AnalyticsPage";
