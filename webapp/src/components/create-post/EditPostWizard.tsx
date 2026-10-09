import { Alert, Spinner } from "@optimusfoundry/quiet";
import { useGetPostDetails } from "@/hooks/useGetPostDetails";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";
import type { WizardState } from "./useCreatePostWizard";
import { WizardInner } from "./WizardInner";

interface EditPostWizardProps {
	editPostId: string;
}

/**
 * Wrapper component that fetches post details and builds initial overrides
 * for editing an existing post.
 */
export function EditPostWizard({ editPostId }: EditPostWizardProps) {
	const { post, platformPosts, media, captureMedia, loading, error, refetch } =
		useGetPostDetails(editPostId);

	if (loading) return <Spinner aria-label="Loading post" />;
	if (error) return <Alert variant="error">{error}</Alert>;
	if (!post) return <Alert variant="error">Post not found</Alert>;

	const overrides = buildInitialOverrides(
		post.content,
		post.contentType,
		platformPosts,
		media,
	);
	if (post.scheduledAt) {
		overrides.scheduledAt = post.scheduledAt;
	}

	const hasBeenPublished =
		post.status === "publishing" ||
		post.status === "published" ||
		post.status === "partially_published" ||
		post.status === "failed";

	return (
		<WizardInner
			editPostId={editPostId}
			initialOverrides={overrides}
			initialBaseContent={post.baseContent}
			readOnly={hasBeenPublished}
			platformPosts={hasBeenPublished ? platformPosts : undefined}
			postStatus={post.status}
			captureMedia={captureMedia}
			onRegenerated={refetch}
		/>
	);
}

/**
 * Helper to transform persisted post data into wizard initial state.
 */
function buildInitialOverrides(
	content: string,
	contentType: string,
	platformPosts: PlatformPost[],
	media: MediaItem[],
): Partial<WizardState> {
	const selectedPlatforms = platformPosts.map(
		(pp) => pp.platform as PlatformType,
	);
	const platformContent: Partial<Record<PlatformType, string>> = {};
	const threadContent: Partial<
		Record<PlatformType, { content: string; imageIndex?: number }[]>
	> = {};

	for (const pp of platformPosts) {
		const platform = pp.platform as PlatformType;
		if (pp.content) {
			platformContent[platform] = pp.content;
		}
		if (pp.threadSegments && pp.threadSegments.length > 0) {
			threadContent[platform] = pp.threadSegments;
		}
	}

	return {
		blurb: content,
		contentType: (contentType === "thread"
			? "thread"
			: "text") as WizardState["contentType"],
		selectedPlatforms,
		platformContent,
		threadContent,
		uploadedMedia: media,
		generated: selectedPlatforms.length > 0,
	};
}
