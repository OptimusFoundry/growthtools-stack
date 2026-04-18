import { createFileRoute } from "@tanstack/react-router";
import { BlogEditor } from "@/components/blog/BlogEditor";

export const Route = createFileRoute("/blog_/$id")({
	component: BlogDetailPage,
});

function BlogDetailPage() {
	const { id } = Route.useParams();
	return <BlogEditor editPostId={id} />;
}
