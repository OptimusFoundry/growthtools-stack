import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toBlogPost } from "@/api/transforms/blog";
import type { ApiBlogPost } from "@/api/types/blog";
import type { BlogPost, CreateBlogPostRequest } from "@/types/blog";
import { getErrorMessage } from "@/utils";

export const useCreateBlogPost = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const createBlogPost = useCallback(
		async (data: CreateBlogPostRequest): Promise<BlogPost> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiBlogPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
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

	return { createBlogPost, loading, error };
};
