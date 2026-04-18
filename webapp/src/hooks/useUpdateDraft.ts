import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toPost } from "@/api/transforms/post";
import type { ApiPost } from "@/api/types/post";
import type { Post, SaveDraftRequest } from "@/types/post";
import { getErrorMessage } from "@/utils/errorHandler";

export const useUpdateDraft = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const updateDraft = useCallback(
		async (postId: string, data: SaveDraftRequest): Promise<Post> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${postId}/draft`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
					},
				);
				return toPost(response);
			} catch (err: unknown) {
				const message = getErrorMessage(err);
				setError(message);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	return { updateDraft, loading, error };
};
