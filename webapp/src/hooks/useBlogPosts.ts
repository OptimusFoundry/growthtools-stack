import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toBlogPosts } from "@/api/transforms/blog";
import type { ApiBlogPost } from "@/api/types/blog";
import type { BlogPost, BlogStatus } from "@/types/blog";
import { getErrorMessage, isAbortError } from "@/utils";

interface BlogFilters {
	status?: BlogStatus;
	limit?: number;
	offset?: number;
}

export const useBlogPosts = (filters?: BlogFilters) => {
	const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchBlogPosts = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams();
				if (filters?.status) params.set("status", filters.status);
				if (filters?.limit !== undefined)
					params.set("limit", String(filters.limit));
				if (filters?.offset !== undefined)
					params.set("offset", String(filters.offset));

				const query = params.toString();
				const url = `${import.meta.env.VITE_API_URL}/api/protected/blog${query ? `?${query}` : ""}`;

				const response = await fetcher<ApiBlogPost[]>(url, {
					method: "GET",
					signal,
				});
				setBlogPosts(toBlogPosts(response));
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
		[filters?.status, filters?.limit, filters?.offset],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchBlogPosts(controller.signal);
		return () => controller.abort();
	}, [fetchBlogPosts]);

	useEffect(() => {
		const controller = new AbortController();
		fetchBlogPosts(controller.signal);
		return () => controller.abort();
	}, [fetchBlogPosts]);

	return { blogPosts, loading, error, refetch };
};
