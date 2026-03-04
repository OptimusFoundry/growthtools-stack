import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

export const useSchedulePost = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const schedulePost = useCallback(async (id: string, scheduledAt: string): Promise<void> => {
		setLoading(true);
		setError(null);

		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/posts/${id}/schedule`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ scheduled_at: scheduledAt }),
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

	return { schedulePost, loading, error };
};
