import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

export const usePublishBlog = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const publishBlog = useCallback(async (id: string): Promise<void> => {
		setLoading(true);
		setError(null);

		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/blog/${id}/publish`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				},
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			setError(message);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return { publishBlog, loading, error };
};
