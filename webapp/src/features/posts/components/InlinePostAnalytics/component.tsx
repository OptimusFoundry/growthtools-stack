import { BarChart2, RefreshCw } from "lucide-react";
import { PlatformPostAnalyticsCard } from "@/features/posts/components/PlatformPostAnalyticsCard/component";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton/Skeleton";
import { Text } from "@/proto-design-system/components/primitives/Text/Text";

interface InlinePostAnalyticsProps {
	postId: string;
}

export function InlinePostAnalytics({ postId }: InlinePostAnalyticsProps) {
	const { data, loading, error, refetch } = usePostAnalytics(postId);

	if (loading) {
		return (
			<Stack gap="md">
				<Skeleton height={140} />
				<Skeleton height={140} />
			</Stack>
		);
	}

	if (error?.includes("404") || error?.includes("not found")) {
		return (
			<EmptyState
				title="No analytics yet"
				description="Metrics will appear here once the platform reports engagement."
				icon={<BarChart2 size={40} />}
			/>
		);
	}

	if (error) {
		return (
			<Card variant="outlined" padding="md">
				<Stack gap="sm" align="center">
					<Text weight="semibold" size="sm">
						Couldn't load analytics
					</Text>
					<Button
						variant="ghost"
						size="sm"
						leftIcon={<RefreshCw size={14} />}
						onClick={refetch}
					>
						Retry
					</Button>
				</Stack>
			</Card>
		);
	}

	if (!data || data.platformPosts.length === 0) {
		return (
			<EmptyState
				title="No analytics yet"
				description="Metrics will appear here once the platform reports engagement."
				icon={<BarChart2 size={40} />}
			/>
		);
	}

	return (
		<Stack gap="md">
			{data.platformPosts.map((pp) => (
				<PlatformPostAnalyticsCard key={pp.platformPostId} pp={pp} />
			))}
		</Stack>
	);
}
