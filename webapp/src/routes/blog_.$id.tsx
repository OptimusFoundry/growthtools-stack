import { createFileRoute } from "@tanstack/react-router";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { Topbar } from "@/components/Layout/Topbar";

export const Route = createFileRoute("/blog_/$id")({
	component: BlogDetailPage,
});

function BlogDetailPage() {
	const { id } = Route.useParams();
	return (
		<>
			<Topbar
				breadcrumbs={[{ label: "Blog", href: "/blog" }, { label: "Edit" }]}
			/>
			<BlogEditor editPostId={id} />
		</>
	);
}
