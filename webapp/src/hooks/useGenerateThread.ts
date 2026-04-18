import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

interface GenerateThreadResponse {
	thread: string[];
}

export const useGenerateThread = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const generateThread = useCallback(
		async (
			content: string,
			platform: string,
		): Promise<GenerateThreadResponse> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<GenerateThreadResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/content/thread`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ content, platform }),
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

	return { generateThread, loading, error };
};
