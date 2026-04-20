import { createFileRoute, useParams } from "@tanstack/react-router";
import { PublishedPostPage } from "@/features/posts/components/PublishedPostPage/component";

export const Route = createFileRoute("/posts_/$id_/analytics")({
	component: PublishedPostRoute,
});

function PublishedPostRoute() {
	const { id } = useParams({ from: "/posts_/$id_/analytics" });
	return <PublishedPostPage postId={id} />;
}
