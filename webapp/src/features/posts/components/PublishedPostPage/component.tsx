import { Navigate } from "@tanstack/react-router";
import { PublishedPostView } from "@/components/create-post/PublishedPostView";
import { useGetPostDetails } from "@/hooks/useGetPostDetails";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import type { PlatformType } from "@/types/platform";

interface PublishedPostPageProps {
	postId: string;
}

/**
 * Route component for `/posts/:id/analytics`. Fetches the post and routes to
 * the right view:
 *   - published / partially_published → <PublishedPostView> (detail archetype)
 *   - anything else                    → redirect to the editable wizard at
 *                                        /posts/:id
 */
export function PublishedPostPage({ postId }: PublishedPostPageProps) {
	const { post, platformPosts, media, loading, error } =
		useGetPostDetails(postId);

	if (loading) return <Spinner />;
	if (error) return <Alert variant="error">{error}</Alert>;
	if (!post) return <Alert variant="error">Post not found</Alert>;

	if (post.status !== "published" && post.status !== "partially_published") {
		return <Navigate to="/posts/$id" params={{ id: postId }} replace />;
	}

	const selectedPlatforms = platformPosts.map(
		(pp) => pp.platform as PlatformType,
	);
	const platformContent: Partial<Record<PlatformType, string>> = {};
	const threadContent: Partial<
		Record<PlatformType, { content: string; imageIndex?: number }[]>
	> = {};
	for (const pp of platformPosts) {
		const platform = pp.platform as PlatformType;
		if (pp.content) platformContent[platform] = pp.content;
		if (pp.threadSegments && pp.threadSegments.length > 0) {
			threadContent[platform] = pp.threadSegments;
		}
	}

	return (
		<PublishedPostView
			postId={postId}
			status={post.status}
			blurb={post.content}
			contentType={post.contentType === "thread" ? "thread" : "text"}
			selectedPlatforms={selectedPlatforms}
			platformContent={platformContent}
			threadContent={threadContent}
			uploadedMedia={media}
			platformPosts={platformPosts}
		/>
	);
}
