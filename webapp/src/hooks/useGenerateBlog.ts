import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toBlogPost } from "@/api/transforms/blog";
import type { ApiBlogPost } from "@/api/types/blog";
import type { BlogPost } from "@/types/blog";
import { getErrorMessage } from "@/utils/errorHandler";

export const useGenerateBlog = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const generateBlog = useCallback(
		async (
			instruction: string,
			keywords: string[],
			mediaIds?: string[],
		): Promise<BlogPost> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiBlogPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/generate`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							instruction,
							keywords,
							media_ids: mediaIds ?? [],
						}),
					},
				);
				return toBlogPost(response);
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

	return { generateBlog, loading, error };
};
