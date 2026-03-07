import { createFileRoute } from "@tanstack/react-router";
import { CreatePostWizard } from "@/components/create-post/CreatePostWizard";

export const Route = createFileRoute("/posts_/new")({
	component: NewPostPage,
});

function NewPostPage() {
	return <CreatePostWizard />;
}
