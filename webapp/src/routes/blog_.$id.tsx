import { createFileRoute } from "@tanstack/react-router";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export const Route = createFileRoute("/blog_/$id")({
	component: BlogDetailPage,
});

function BlogDetailPage() {
	useDocumentTitle("Blog Post");
	const { id } = Route.useParams();
	return <BlogEditor editPostId={id} />;
}
