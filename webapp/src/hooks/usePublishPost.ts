import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

export const usePublishPost = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const publishPost = useCallback(async (id: string, platforms: string[]): Promise<void> => {
		setLoading(true);
		setError(null);

		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/posts/${id}/publish`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ platforms }),
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

	return { publishPost, loading, error };
};
