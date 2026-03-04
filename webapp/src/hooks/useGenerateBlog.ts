import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

interface GenerateBlogResponse {
	title: string;
	content: string;
	slug: string;
}

export const useGenerateBlog = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const generateBlog = useCallback(
		async (topic: string, keywords: string[]): Promise<GenerateBlogResponse> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<GenerateBlogResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/generate`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ topic, keywords }),
					},
				);
				return response;
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
