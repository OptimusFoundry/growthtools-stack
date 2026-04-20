import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toPostListItems } from "@/api/transforms/post";
import type { ApiPostListItem } from "@/api/types/post";
import type { PostFilters, PostListItem } from "@/types/post";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export const useGetPosts = (filters?: PostFilters) => {
	const [posts, setPosts] = useState<PostListItem[]>([]);
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
				if (filters?.from) params.set("from", filters.from);
				if (filters?.to) params.set("to", filters.to);

				const query = params.toString();
				const url = `${import.meta.env.VITE_API_URL}/api/protected/posts${query ? `?${query}` : ""}`;

				const response = await fetcher<ApiPostListItem[]>(url, {
					method: "GET",
					signal,
				});
				setPosts(toPostListItems(response));
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
		[
			filters?.status,
			filters?.contentType,
			filters?.limit,
			filters?.offset,
			filters?.from,
			filters?.to,
		],
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
