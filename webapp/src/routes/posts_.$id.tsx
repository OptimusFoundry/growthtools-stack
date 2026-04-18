import { createFileRoute } from "@tanstack/react-router";
import { CreatePostWizard } from "@/components/create-post/CreatePostWizard";
import { Topbar } from "@/components/Layout/Topbar";

export const Route = createFileRoute("/posts_/$id")({
	component: EditPostPage,
});

function EditPostPage() {
	const { id } = Route.useParams();
	return (
		<>
			<Topbar
				breadcrumbs={[{ label: "Posts", href: "/posts" }, { label: "Edit" }]}
			/>
			<CreatePostWizard editPostId={id} />
		</>
	);
}
