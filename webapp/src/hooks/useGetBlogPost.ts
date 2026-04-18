import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toBlogPost } from "@/api/transforms/blog";
import type { ApiBlogPost } from "@/api/types/blog";
import type { BlogPost } from "@/types/blog";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export const useGetBlogPost = (id: string | undefined) => {
	const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchBlogPost = useCallback(
		async (signal: AbortSignal) => {
			if (!id) return;

			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiBlogPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}`,
					{ method: "GET", signal },
				);
				setBlogPost(toBlogPost(response));
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
		fetchBlogPost(controller.signal);
		return () => controller.abort();
	}, [fetchBlogPost]);

	useEffect(() => {
		const controller = new AbortController();
		fetchBlogPost(controller.signal);
		return () => controller.abort();
	}, [fetchBlogPost]);

	return { blogPost, loading, error, refetch };
};
