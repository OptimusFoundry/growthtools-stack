import { ExternalLink } from "lucide-react";
import { EngagementTimelineChart } from "@/features/analytics/components/EngagementTimelineChart/component";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Tooltip } from "@/proto-design-system/components/overlays/Tooltip";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import type { PlatformPostAnalytics } from "@/types/analytics";
import type { PlatformType } from "@/types/platform";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import styles from "./component.module.scss";

interface PlatformPostAnalyticsCardProps {
	pp: PlatformPostAnalytics;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatNum(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function KpiCell({ label, value }: { label: string; value: number }) {
	return (
		<div className={styles.kpiCell}>
			<span className={styles.kpiLabel}>{label}</span>
			<span className={styles.kpiValue}>{formatNum(value)}</span>
		</div>
	);
}

export function PlatformPostAnalyticsCard({
	pp,
}: PlatformPostAnalyticsCardProps) {
	const platformLabel =
		PLATFORM_DISPLAY_NAMES[pp.platform as PlatformType] ?? pp.platform;

	const isUnavailable = pp.analyticsUnavailableAt !== null;

	const chartData = pp.history.map((h) => ({
		collectedAt: h.collectedAt,
		value: h.impressions,
	}));

	const lastCollected = pp.latest?.collectedAt
		? formatDate(pp.latest.collectedAt)
		: null;

	return (
		<Card variant="outlined" padding="md">
			{/* Header row */}
			<Stack
				direction="row"
				justify="between"
				align="center"
				className={styles.header}
			>
				<Stack direction="row" gap="sm" align="center">
					<Badge variant="default">{platformLabel}</Badge>
					{pp.publishedAt && (
						<span className={styles.mono}>{formatDate(pp.publishedAt)}</span>
					)}
				</Stack>
				<Stack direction="row" gap="sm" align="center">
					{isUnavailable && (
						<Badge variant="warning">Analytics unavailable</Badge>
					)}
					{pp.postUrl && (
						<a
							href={pp.postUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={styles.externalLink}
							aria-label={`Open on ${platformLabel}`}
						>
							<ExternalLink size={16} />
						</a>
					)}
				</Stack>
			</Stack>

			{/* Unavailable branch */}
			{isUnavailable ? (
				<Stack gap="sm" className={styles.unavailableBody}>
					<Tooltip
						content={`This post is no longer reachable on ${platformLabel}. Metrics stopped updating on ${formatDate(pp.analyticsUnavailableAt!)}.`}
					>
						<span className={styles.unavailableHint}>
							Why is this unavailable?
						</span>
					</Tooltip>
					{pp.latest && (
						<div className={`${styles.kpiGrid} ${styles.kpiGridFaded}`}>
							<KpiCell label="Impressions" value={pp.latest.impressions} />
							<KpiCell label="Likes" value={pp.latest.likes} />
							<KpiCell label="Comments" value={pp.latest.comments} />
							<KpiCell label="Shares" value={pp.latest.shares} />
						</div>
					)}
				</Stack>
			) : (
				/* Live branch */
				<Stack gap="md" className={styles.liveBody}>
					<div className={styles.kpiGrid}>
						<KpiCell label="Impressions" value={pp.latest?.impressions ?? 0} />
						<KpiCell label="Likes" value={pp.latest?.likes ?? 0} />
						<KpiCell label="Comments" value={pp.latest?.comments ?? 0} />
						<KpiCell label="Shares" value={pp.latest?.shares ?? 0} />
					</div>
					<EngagementTimelineChart
						data={chartData}
						stroke="var(--color-primary)"
						height={140}
						ariaLabel={`Impressions over time for ${platformLabel}`}
					/>
					{lastCollected && (
						<span className={styles.updatedCaption}>
							Updated {lastCollected}
						</span>
					)}
				</Stack>
			)}
		</Card>
	);
}
