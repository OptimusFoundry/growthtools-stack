import {
	Badge,
	Button,
	Col,
	Grid,
	Stack,
	Text,
	Tooltip,
} from "@optimusfoundry/quiet";
import { ExternalLink } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { EngagementTimelineChart } from "@/features/analytics/components/EngagementTimelineChart/component";
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

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatNum(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function KpiCell({ label, value }: { label: string; value: number }) {
	return (
		<Stack gap="xs">
			<Text mono color="muted">
				{label}
			</Text>
			<Text size="xl" weight="bold">
				{formatNum(value)}
			</Text>
		</Stack>
	);
}

function KpiRow({
	impressions,
	likes,
	comments,
	shares,
	faded = false,
}: {
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	faded?: boolean;
}) {
	return (
		<Grid columns={12} gap="sm" className={faded ? styles.faded : undefined}>
			<Col span={3} spanMd={6} spanSm={6}>
				<KpiCell label="Impressions" value={impressions} />
			</Col>
			<Col span={3} spanMd={6} spanSm={6}>
				<KpiCell label="Likes" value={likes} />
			</Col>
			<Col span={3} spanMd={6} spanSm={6}>
				<KpiCell label="Comments" value={comments} />
			</Col>
			<Col span={3} spanMd={6} spanSm={6}>
				<KpiCell label="Shares" value={shares} />
			</Col>
		</Grid>
	);
}

export function PlatformPostAnalyticsCard({
	pp,
}: PlatformPostAnalyticsCardProps) {
	const platformLabel =
		PLATFORM_DISPLAY_NAMES[pp.platform as PlatformType] ?? pp.platform;

	const chartData = pp.history.map((h) => ({
		collectedAt: h.collectedAt,
		value: h.impressions,
	}));

	const lastCollected = pp.latest?.collectedAt
		? formatDateTime(pp.latest.collectedAt)
		: null;

	return (
		<section className={styles.panel}>
			<Stack gap="sm">
				<Stack direction="row" justify="space-between" align="center" wrap>
					<Stack direction="row" gap="xs" align="center" wrap>
						<Badge variant="default" size="sm">
							{platformLabel}
						</Badge>
						{pp.publishedAt && (
							<Text mono color="muted">
								Published · {formatDate(pp.publishedAt)}
							</Text>
						)}
					</Stack>
					<Stack direction="row" gap="xs" align="center">
						{pp.analyticsUnavailableAt && (
							<Badge variant="warning" size="sm" dot={false}>
								Analytics unavailable
							</Badge>
						)}
						{pp.postUrl && (
							<Button
								variant="ghost"
								size="sm"
								icon={<AppIcon icon={ExternalLink} />}
								href={pp.postUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`Open on ${platformLabel}`}
							/>
						)}
					</Stack>
				</Stack>

				{pp.analyticsUnavailableAt ? (
					<Stack gap="xs">
						<Tooltip
							content={`This post is no longer reachable on ${platformLabel}. Metrics stopped updating on ${formatDate(pp.analyticsUnavailableAt)}.`}
						>
							<span className={styles.unavailableHint}>
								Why is this unavailable?
							</span>
						</Tooltip>
						{pp.latest && (
							<KpiRow
								faded
								impressions={pp.latest.impressions}
								likes={pp.latest.likes}
								comments={pp.latest.comments}
								shares={pp.latest.shares}
							/>
						)}
					</Stack>
				) : (
					<Stack gap="sm">
						<KpiRow
							impressions={pp.latest?.impressions ?? 0}
							likes={pp.latest?.likes ?? 0}
							comments={pp.latest?.comments ?? 0}
							shares={pp.latest?.shares ?? 0}
						/>
						{lastCollected && (
							<Text mono color="muted">
								As of {lastCollected}
							</Text>
						)}
						<EngagementTimelineChart
							data={chartData}
							height={140}
							ariaLabel={`Impressions over time for ${platformLabel}`}
						/>
					</Stack>
				)}
			</Stack>
		</section>
	);
}
