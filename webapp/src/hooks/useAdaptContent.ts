import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

interface AdaptContentResponse {
	content: string;
}

export const useAdaptContent = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const adaptContent = useCallback(
		async (
			content: string,
			platform: string,
		): Promise<AdaptContentResponse> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<AdaptContentResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/content/adapt`,
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

	return { adaptContent, loading, error };
};
