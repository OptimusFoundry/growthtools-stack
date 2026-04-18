import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toPost } from "@/api/transforms/post";
import type { ApiPost } from "@/api/types/post";
import type { Post, UpdatePostRequest } from "@/types/post";
import { getErrorMessage } from "@/utils/errorHandler";

export const useUpdatePost = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const updatePost = useCallback(
		async (id: string, data: UpdatePostRequest): Promise<Post> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${id}`,
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

	return { updatePost, loading, error };
};
