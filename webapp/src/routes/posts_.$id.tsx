import { createFileRoute } from "@tanstack/react-router";
import { CreatePostWizard } from "@/components/create-post/CreatePostWizard";

export const Route = createFileRoute("/posts_/$id")({
	component: EditPostPage,
});

function EditPostPage() {
	const { id } = Route.useParams();
	return <CreatePostWizard editPostId={id} />;
}
