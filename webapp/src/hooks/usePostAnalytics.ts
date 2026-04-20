import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toPostAnalytics } from "@/api/transforms/analytics";
import type { ApiPostAnalytics } from "@/api/types/analytics";
import type { PostAnalytics } from "@/types/analytics";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export interface UsePostAnalyticsResult {
	data: PostAnalytics | null;
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

export function usePostAnalytics(postId: string): UsePostAnalyticsResult {
	const [data, setData] = useState<PostAnalytics | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);
			try {
				const raw = await fetcher<ApiPostAnalytics>(
					`${import.meta.env.VITE_API_URL}/api/protected/posts/${postId}/analytics`,
					{ method: "GET", signal },
				);
				setData(toPostAnalytics(raw));
			} catch (err: unknown) {
				if (isAbortError(err)) return;
				setError(getErrorMessage(err));
			} finally {
				setLoading(false);
			}
		},
		[postId],
	);

	const refetch = useCallback(() => {
		const ctrl = new AbortController();
		fetchData(ctrl.signal);
		return () => ctrl.abort();
	}, [fetchData]);

	useEffect(() => {
		const ctrl = new AbortController();
		fetchData(ctrl.signal);
		return () => ctrl.abort();
	}, [fetchData]);

	return { data, loading, error, refetch };
}
