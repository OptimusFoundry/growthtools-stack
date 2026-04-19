import { useNavigate } from "@tanstack/react-router";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { BlogWizard } from "./BlogWizard";

export interface BlogEditorProps {
	editPostId?: string;
}

// ── Create mode ──────────────────────────────────────────────────────────────

function CreateBlogEditor() {
	const navigate = useNavigate();
	return <BlogWizard onDone={() => navigate({ to: "/blog" })} />;
}

// ── Edit mode ──────────────────────────────────────────────────────────────

function EditBlogEditor({ id }: { id: string }) {
	const navigate = useNavigate();
	const {
		blogPost,
		media,
		loading: fetching,
		error: fetchError,
	} = useGetBlogPost(id);

	if (fetching) return <Spinner />;
	if (fetchError) return <Alert variant="error">{fetchError}</Alert>;
	if (!blogPost) return <Alert variant="warning">Blog post not found.</Alert>;

	return (
		<BlogWizard
			initialBlogPost={blogPost}
			initialMedia={media}
			onDone={() => navigate({ to: "/blog" })}
			onCancel={() => navigate({ to: "/blog" })}
		/>
	);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function BlogEditor({ editPostId }: BlogEditorProps) {
	if (editPostId) {
		return <EditBlogEditor id={editPostId} />;
	}
	return <CreateBlogEditor />;
}

BlogEditor.displayName = "BlogEditor";
