import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toShowcaseJob } from "@/api/transforms/showcasePost";
import type { ApiShowcaseJob } from "@/api/types/showcasePost";
import type { ShowcaseJob } from "@/types/showcasePost";
import { getErrorMessage } from "@/utils/errorHandler";

export const useCreateShowcasePost = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const createShowcasePost = useCallback(
		async (brief: string): Promise<ShowcaseJob> => {
			setLoading(true);
			setError(null);

			try {
				const api = await fetcher<ApiShowcaseJob>(
					`${import.meta.env.VITE_API_URL}/api/protected/showcase-posts`,
					{
						method: "POST",
						body: JSON.stringify({ brief }),
					},
				);
				return toShowcaseJob(api);
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

	return { createShowcasePost, loading, error };
};
