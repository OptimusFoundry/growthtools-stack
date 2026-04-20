import { createFileRoute, useParams } from "@tanstack/react-router";
import { PostAnalyticsPage } from "@/features/posts/components/PostAnalyticsPage/component";

export const Route = createFileRoute("/posts_/$id/analytics")({
	component: PostAnalyticsRoute,
});

function PostAnalyticsRoute() {
	const { id } = useParams({ from: "/posts_/$id/analytics" });
	return <PostAnalyticsPage postId={id} />;
}
