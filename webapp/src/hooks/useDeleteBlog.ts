import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toDeleteBlogResult } from "@/api/transforms/blog";
import type { ApiDeleteBlogResponse } from "@/api/types/blog";
import type { DeleteBlogResult } from "@/types/blog";
import { getErrorMessage } from "@/utils/errorHandler";

export const useDeleteBlog = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const deleteBlog = useCallback(
		async (id: string): Promise<DeleteBlogResult> => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetcher<ApiDeleteBlogResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}`,
					{ method: "DELETE" },
				);
				return toDeleteBlogResult(response);
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

	return { deleteBlog, loading, error };
};
