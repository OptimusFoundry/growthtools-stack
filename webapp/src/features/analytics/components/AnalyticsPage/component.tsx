/**
 * AnalyticsPage Component
 * Social media analytics dashboard with stats, platform breakdown
 */

import { BarChart2, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { memo } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { StatCard } from "@/proto-design-system/components/data/StatCard";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PlatformType } from "@/types/platform";
import { PLATFORM_DISPLAY_NAMES } from "@/types/platform";
import styles from "./component.module.scss";

function formatNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toLocaleString();
}

function getPlatformLabel(platform: string): string {
	return PLATFORM_DISPLAY_NAMES[platform as PlatformType] ?? platform;
}

export const AnalyticsPage = memo(function AnalyticsPage() {
	const { overview, platformBreakdown, loading } = useAnalytics();

	if (loading) {
		return (
			<Stack gap="lg" className={styles.page} align="center" justify="center">
				<Spinner size="lg" />
			</Stack>
		);
	}

	if (!overview) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<Stack gap="xs">
					<Text as="h1" size="2xl" weight="semibold">
						Analytics
					</Text>
					<Text color="secondary">
						Track your social media performance across platforms
					</Text>
				</Stack>
				<EmptyState
					title="No Analytics Data"
					description="Connect your platforms and start publishing to see analytics here."
					icon={<BarChart2 size={48} />}
				/>
			</Stack>
		);
	}

	return (
		<Stack gap="lg" className={styles.page} animate>
			<Stack gap="xs">
				<Text as="h1" size="2xl" weight="semibold">
					Analytics
				</Text>
				<Text color="secondary">
					Track your social media performance across platforms
				</Text>
			</Stack>

			<div className={styles.statsGrid}>
				<StatCard
					label="Impressions"
					value={formatNumber(overview.totalImpressions)}
					numericValue={overview.totalImpressions}
					formatValue={formatNumber}
					icon={<Eye size={18} />}
					variant="outlined"
				/>
				<StatCard
					label="Likes"
					value={formatNumber(overview.totalLikes)}
					numericValue={overview.totalLikes}
					formatValue={formatNumber}
					icon={<Heart size={18} />}
					variant="outlined"
				/>
				<StatCard
					label="Comments"
					value={formatNumber(overview.totalComments)}
					numericValue={overview.totalComments}
					formatValue={formatNumber}
					icon={<MessageCircle size={18} />}
					variant="outlined"
				/>
				<StatCard
					label="Shares"
					value={formatNumber(overview.totalShares)}
					numericValue={overview.totalShares}
					formatValue={formatNumber}
					icon={<Share2 size={18} />}
					variant="outlined"
				/>
			</div>

			{platformBreakdown.length > 0 && (
				<Card padding="md">
					<Stack gap="md">
						<Text as="h2" size="lg" weight="semibold">
							Platform Breakdown
						</Text>
						<div className={styles.tableWrapper}>
							<table className={styles.table}>
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
	);
});

AnalyticsPage.displayName = "AnalyticsPage";
