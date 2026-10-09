import {
	Alert,
	Button,
	EmptyState,
	Skeleton,
	Stack,
} from "@optimusfoundry/quiet";
import { BarChart2, RefreshCw } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { PlatformPostAnalyticsCard } from "@/features/posts/components/PlatformPostAnalyticsCard/component";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";

interface InlinePostAnalyticsProps {
	postId: string;
}

function NoAnalytics() {
	return (
		<EmptyState
			size="sm"
			title={trimTrailingPeriod("No analytics yet")}
			description="Metrics will appear here once the platform reports engagement."
			icon={<AppIcon icon={BarChart2} size="xl" />}
		/>
	);
}

export function InlinePostAnalytics({ postId }: InlinePostAnalyticsProps) {
	const { data, loading, error, refetch } = usePostAnalytics(postId);

	if (loading) {
		return (
			<Stack gap="sm">
				<Skeleton variant="rounded" height={140} />
				<Skeleton variant="rounded" height={140} />
			</Stack>
		);
	}

	if (error?.includes("404") || error?.includes("not found")) {
		return <NoAnalytics />;
	}

	if (error) {
		return (
			<Alert
				variant="error"
				title="Couldn't load analytics"
				action={
					<Button
						variant="ghost"
						size="sm"
						leftIcon={<AppIcon icon={RefreshCw} />}
						onClick={refetch}
					>
						Retry
					</Button>
				}
			/>
		);
	}

	if (!data || data.platformPosts.length === 0) {
		return <NoAnalytics />;
	}

	return (
		<Stack gap="sm">
			{data.platformPosts.map((pp) => (
				<PlatformPostAnalyticsCard key={pp.platformPostId} pp={pp} />
			))}
		</Stack>
	);
}
