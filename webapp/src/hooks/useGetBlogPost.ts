import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toBlogPost } from "@/api/transforms/blog";
import { toMediaItems } from "@/api/transforms/media";
import type { ApiBlogPostWithMedia } from "@/api/types/blog";
import type { BlogPost } from "@/types/blog";
import type { MediaItem } from "@/types/media";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export const useGetBlogPost = (id: string | undefined) => {
	const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
	const [media, setMedia] = useState<MediaItem[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchBlogPost = useCallback(
		async (signal: AbortSignal) => {
			if (!id) return;

			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiBlogPostWithMedia>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}`,
					{ method: "GET", signal },
				);
				setBlogPost(toBlogPost(response.post));
				setMedia(toMediaItems(response.media ?? []));
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

	return { blogPost, media, loading, error, refetch };
};
