import { useNavigate } from "@tanstack/react-router";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import type { BlogPost } from "@/types/blog";
import type { MediaItem } from "@/types/media";
import { BlogSitePublishStatus } from "./BlogSitePublishStatus";
import { BlogWizard } from "./BlogWizard";
import { useBlogSitePublishStatus } from "./useBlogSitePublishStatus";

export interface BlogEditorProps {
	editPostId?: string;
}

// ── Create mode ──────────────────────────────────────────────────────────────

function CreateBlogEditor() {
	const navigate = useNavigate();
	return (
		<BlogWizard
			onDone={() => navigate({ to: "/blog" })}
			onPublishedNavigate={(postId) =>
				navigate({ to: "/blog/$id", params: { id: postId } })
			}
		/>
	);
}

// ── Edit mode ──────────────────────────────────────────────────────────────

// Split out of EditBlogEditor because useBlogSitePublishStatus can't be
// called conditionally (hooks rule) but EditBlogEditor's fetch has early
// returns before blogPost is known non-null.
function EditBlogEditorLoaded({
	post,
	media,
}: {
	post: BlogPost;
	media: MediaItem[];
}) {
	const navigate = useNavigate();
	const statusHook = useBlogSitePublishStatus(post);

	return (
		<BlogWizard
			initialBlogPost={statusHook.post}
			initialMedia={media}
			onDone={() => navigate({ to: "/blog" })}
			onCancel={() => navigate({ to: "/blog" })}
			onPublished={statusHook.applyPublishResult}
			statusSlot={
				<BlogSitePublishStatus
					post={statusHook.post}
					sitePublishError={statusHook.sitePublishError}
					onRetry={statusHook.handleRetry}
					retrying={statusHook.retrying}
				/>
			}
		/>
	);
}

function EditBlogEditor({ id }: { id: string }) {
	const {
		blogPost,
		media,
		loading: fetching,
		error: fetchError,
	} = useGetBlogPost(id);

	if (fetching) return <Spinner />;
	if (fetchError) return <Alert variant="error">{fetchError}</Alert>;
	if (!blogPost) return <Alert variant="warning">Blog post not found.</Alert>;

	return <EditBlogEditorLoaded post={blogPost} media={media} />;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function BlogEditor({ editPostId }: BlogEditorProps) {
	if (editPostId) {
		return <EditBlogEditor id={editPostId} />;
	}
	return <CreateBlogEditor />;
}

BlogEditor.displayName = "BlogEditor";
