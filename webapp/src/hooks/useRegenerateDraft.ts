import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toPost } from "@/api/transforms/post";
import type { ApiPost } from "@/api/types/post";
import type { Post } from "@/types/post";
import { getErrorMessage } from "@/utils/errorHandler";

/**
 * Rewrites a commit-generated draft's copy around the chosen capture media.
 * The selection (in order) also becomes the post's media.
 */
export const useRegenerateDraft = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const regenerateDraft = useCallback(
		async (postId: string, mediaIds: string[]): Promise<Post> => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetcher<ApiPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${postId}/regenerate`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ media_ids: mediaIds }),
					},
				);
				return toPost(response);
			} catch (err: unknown) {
				setError(getErrorMessage(err));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	return { regenerateDraft, loading, error };
};
