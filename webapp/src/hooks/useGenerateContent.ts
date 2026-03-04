import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

interface GenerateContentResponse {
	content: string;
}

export const useGenerateContent = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const generateContent = useCallback(
		async (prompt: string, platforms: string[]): Promise<GenerateContentResponse> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<GenerateContentResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/content/generate`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ prompt, platforms }),
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

	return { generateContent, loading, error };
};
