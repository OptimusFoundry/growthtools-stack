import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toPost } from "@/api/transforms/post";
import type { ApiPost } from "@/api/types/post";
import type { Post } from "@/types/post";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export const useGetPost = (id: string | undefined) => {
	const [post, setPost] = useState<Post | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchPost = useCallback(
		async (signal: AbortSignal) => {
			if (!id) return;

			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${id}`,
					{ method: "GET", signal },
				);
				setPost(toPost(response));
			} catch (err: unknown) {
				if (isAbortError(err)) {
					console.debug("Request was aborted.");
				} else {
					setError(getErrorMessage(err));
				}
			} finally {
				setLoading(false);
			}
		},
		[id],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchPost(controller.signal);
		return () => controller.abort();
	}, [fetchPost]);

	useEffect(() => {
		const controller = new AbortController();
		fetchPost(controller.signal);
		return () => controller.abort();
	}, [fetchPost]);

	return { post, loading, error, refetch };
};
