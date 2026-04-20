import { Link } from "@tanstack/react-router";
import { PenSquare, RefreshCw } from "lucide-react";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PlatformPostAnalyticsCard } from "../PlatformPostAnalyticsCard/component";
import styles from "./component.module.scss";

interface PostAnalyticsPageProps {
	postId: string;
	/** Excerpt of the post body (40 chars max) for breadcrumb. */
	postExcerpt?: string;
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}…`;
}

export function PostAnalyticsPage({
	postId,
	postExcerpt,
}: PostAnalyticsPageProps) {
	const { data, loading, error, refetch } = usePostAnalytics(postId);

	const breadcrumbLabel = postExcerpt ? truncate(postExcerpt, 40) : "Post";

	// ── Loading ───────────────────────────────────────────────────────────────
	if (loading) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<Breadcrumb
					size="lg"
					items={[
						{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
						{ label: breadcrumbLabel, href: `/posts/${postId}` },
						{ label: "Analytics" },
					]}
				/>
				<Divider />
				<Skeleton height={80} />
				<Skeleton height={160} />
				<Skeleton height={160} />
			</Stack>
		);
	}

	// ── 404 ───────────────────────────────────────────────────────────────────
	if (error?.includes("404") || error?.includes("not found")) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<Breadcrumb
					size="lg"
					items={[
						{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
						{ label: "Analytics" },
					]}
				/>
				<Divider />
				<Card variant="outlined" padding="lg">
					<Stack gap="md" align="center">
						<Text weight="semibold">Post not found.</Text>
						<Link to="/posts">
							<Button variant="secondary">Back to Posts</Button>
						</Link>
					</Stack>
				</Card>
			</Stack>
		);
	}

	// ── Error ─────────────────────────────────────────────────────────────────
	if (error) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<Breadcrumb
					size="lg"
					items={[
						{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
						{ label: "Analytics" },
					]}
				/>
				<Divider />
				<Card variant="outlined" padding="lg">
					<Stack gap="md" align="center">
						<Text weight="semibold">Something went wrong</Text>
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
		);
	}

	// ── Empty — no platform posts ─────────────────────────────────────────────
	if (!data || data.platformPosts.length === 0) {
		return (
			<Stack gap="lg" className={styles.page} animate>
				<Breadcrumb
					size="lg"
					items={[
						{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
						{ label: breadcrumbLabel, href: `/posts/${postId}` },
						{ label: "Analytics" },
					]}
				/>
				<Divider />
				<EmptyState
					title="No analytics yet"
					description="This post isn't published yet. Analytics will appear here once it goes live."
					icon={<PenSquare size={48} />}
				/>
			</Stack>
		);
	}

	// ── Happy path ─────────────────────────────────────────────────────────────
	return (
		<Stack gap="lg" className={styles.page} animate>
			<Breadcrumb
				size="lg"
				items={[
					{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
					{ label: breadcrumbLabel, href: `/posts/${postId}` },
					{ label: "Analytics" },
				]}
			/>
			<Divider />

			<Stack gap="md">
				{data.platformPosts.map((pp) => (
					<PlatformPostAnalyticsCard key={pp.platformPostId} pp={pp} />
				))}
			</Stack>
		</Stack>
	);
}
