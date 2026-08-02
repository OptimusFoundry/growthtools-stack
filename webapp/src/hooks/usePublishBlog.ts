import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toBlogPublishResult } from "@/api/transforms/blog";
import type { ApiBlogPublishResponse } from "@/api/types/blog";
import type { BlogPublishResult } from "@/types/blog";
import { getErrorMessage } from "@/utils/errorHandler";

export const usePublishBlog = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [retrying, setRetrying] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const publishBlog = useCallback(
		async (id: string): Promise<BlogPublishResult> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiBlogPublishResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}/publish`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
					},
				);
				return toBlogPublishResult(response);
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

	const retryPublish = useCallback(
		async (id: string): Promise<BlogPublishResult> => {
			setRetrying(true);
			setError(null);

			try {
				const response = await fetcher<ApiBlogPublishResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}/retry-site-publish`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
					},
				);
				return toBlogPublishResult(response);
			} catch (err: unknown) {
				const message = getErrorMessage(err);
				setError(message);
				throw err;
			} finally {
				setRetrying(false);
			}
		},
		[],
	);

	return { publishBlog, retryPublish, loading, retrying, error };
};
