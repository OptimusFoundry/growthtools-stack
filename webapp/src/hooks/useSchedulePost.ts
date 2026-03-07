import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toPost } from "@/api/transforms/post";
import type { ApiPost } from "@/api/types/post";
import type { Post } from "@/types/post";
import { getErrorMessage } from "@/utils";

export const useSchedulePost = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const schedulePost = useCallback(
		async (id: string, scheduledAt: string): Promise<Post> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiPost>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${id}/schedule`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ scheduled_at: scheduledAt }),
					},
				);
				return toPost(response);
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

	return { schedulePost, loading, error };
};
