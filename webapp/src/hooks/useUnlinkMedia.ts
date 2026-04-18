import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

export const useUnlinkMedia = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const unlinkMedia = useCallback(
		async (postID: string, mediaID: string): Promise<void> => {
			setLoading(true);
			setError(null);
			try {
				await fetcher<{ message: string }>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${postID}/media/${mediaID}`,
					{ method: "DELETE" },
				);
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

	return { unlinkMedia, loading, error };
};
