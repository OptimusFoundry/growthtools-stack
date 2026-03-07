import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toPosts } from "@/api/transforms/post";
import type { ApiPost } from "@/api/types/post";
import type { Post, PostFilters } from "@/types/post";
import { getErrorMessage, isAbortError } from "@/utils";

export const useGetPosts = (filters?: PostFilters) => {
	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchPosts = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams();
				if (filters?.status) params.set("status", filters.status);
				if (filters?.contentType)
					params.set("content_type", filters.contentType);
				if (filters?.limit !== undefined)
					params.set("limit", String(filters.limit));
				if (filters?.offset !== undefined)
					params.set("offset", String(filters.offset));

				const query = params.toString();
				const url = `${import.meta.env.VITE_API_URL}/api/protected/posts${query ? `?${query}` : ""}`;

				const response = await fetcher<ApiPost[]>(url, {
					method: "GET",
					signal,
				});
				setPosts(toPosts(response));
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
		[filters?.status, filters?.contentType, filters?.limit, filters?.offset],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchPosts(controller.signal);
		return () => controller.abort();
	}, [fetchPosts]);

	useEffect(() => {
		const controller = new AbortController();
		fetchPosts(controller.signal);
		return () => controller.abort();
	}, [fetchPosts]);

	return { posts, loading, error, refetch };
};
