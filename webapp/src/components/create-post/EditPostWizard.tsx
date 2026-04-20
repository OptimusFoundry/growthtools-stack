import { useGetPostDetails } from "@/hooks/useGetPostDetails";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import type { MediaItem } from "@/types/media";
import type { PlatformType } from "@/types/platform";
import type { PlatformPost } from "@/types/post";
import { PublishedPostView } from "./PublishedPostView";
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
	const { post, platformPosts, media, loading, error } =
		useGetPostDetails(editPostId);

	if (loading) return <Spinner />;
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

	// Published posts use a dedicated Detail-archetype view; there is nothing
	// to edit once a post has shipped. publishing/failed stay in the wizard so
	// the user can watch progress or retry.
	if (post.status === "published" || post.status === "partially_published") {
		return (
			<PublishedPostView
				postId={editPostId}
				status={post.status}
				blurb={post.content}
				contentType={overrides.contentType ?? "text"}
				selectedPlatforms={overrides.selectedPlatforms ?? []}
				platformContent={overrides.platformContent ?? {}}
				threadContent={overrides.threadContent ?? {}}
				uploadedMedia={media}
				platformPosts={platformPosts}
			/>
		);
	}

	const isReadOnly = post.status === "publishing" || post.status === "failed";

	return (
		<WizardInner
			editPostId={editPostId}
			initialOverrides={overrides}
			initialBaseContent={post.baseContent}
			readOnly={isReadOnly}
			platformPosts={isReadOnly ? platformPosts : undefined}
			postStatus={post.status}
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
