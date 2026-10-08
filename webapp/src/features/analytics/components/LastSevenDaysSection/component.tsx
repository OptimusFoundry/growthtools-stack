import { Link } from "@tanstack/react-router";
import { useAnalyticsComparison } from "@/hooks/useAnalyticsComparison";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton/Skeleton";
import { Sparkline } from "../Sparkline/component";
import styles from "./component.module.scss";

function formatNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toLocaleString();
}

function TrendChip({ delta }: { delta: number }) {
	const dir = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
	const prefix = delta > 0 ? "+" : "";
	return (
		<span className={`${styles.trendChip} ${styles[`trendChip--${dir}`]}`}>
			{prefix}
			{formatNumber(delta)} vs prior 7d
		</span>
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
				<div className={styles.eyebrow}>LAST 7 DAYS · PERFORMANCE</div>
				<h2 className={styles.heading}>
					Momentum <em>at a glance</em>.
				</h2>
				<div className={styles.grid}>
					<Skeleton height={120} />
					<Skeleton height={120} />
				</div>
			</Stack>
		);
	}

	if (!overview) return null;

	const engagements =
		overview.totalLikes + overview.totalComments + overview.totalShares;

	const impressionSpark = timeseries.map((d) => ({ value: d.impressions }));
	const engagementSpark = timeseries.map((d) => ({
		value: d.likes + d.comments + d.shares,
	}));

	return (
		<Stack gap="md">
			<div className={styles.eyebrow}>LAST 7 DAYS · PERFORMANCE</div>
			<Stack direction="row" justify="between" align="end">
				<h2 className={styles.heading}>
					Momentum <em>at a glance</em>.
				</h2>
				<Link
					to="/analytics"
					search={{ range: "7d" }}
					className={styles.viewAll}
				>
					View analytics →
				</Link>
			</Stack>
			<div className={styles.grid}>
				{/* Impressions card */}
				<div className={styles.card}>
					<div className={styles.cardLabel}>IMPRESSIONS</div>
					<div className={styles.cardValue}>
						{formatNumber(overview.totalImpressions)}
					</div>
					{impressionSpark.length > 0 && (
						<Sparkline
							data={impressionSpark}
							stroke="var(--color-primary)"
							height={60}
							ariaLabel="Impressions sparkline for last 7 days"
						/>
					)}
					{deltas !== null && <TrendChip delta={deltas.impressions} />}
				</div>
				{/* Engagements card */}
				<div className={styles.card}>
					<div className={styles.cardLabel}>ENGAGEMENTS</div>
					<div className={styles.cardValue}>{formatNumber(engagements)}</div>
					{engagementSpark.length > 0 && (
						<Sparkline
							data={engagementSpark}
							stroke="var(--color-accent)"
							height={60}
							ariaLabel="Engagements sparkline for last 7 days"
						/>
					)}
					{deltas !== null && (
						<TrendChip delta={deltas.likes + deltas.comments + deltas.shares} />
					)}
				</div>
			</div>
		</Stack>
	);
}
