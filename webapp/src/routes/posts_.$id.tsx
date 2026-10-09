import { createFileRoute } from "@tanstack/react-router";
import { CreatePostWizard } from "@/components/create-post/CreatePostWizard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export const Route = createFileRoute("/posts_/$id")({
	component: EditPostPage,
});

function EditPostPage() {
	useDocumentTitle("Post");
	const { id } = Route.useParams();
	return <CreatePostWizard editPostId={id} />;
}
