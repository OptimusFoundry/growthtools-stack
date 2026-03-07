import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoJobs } from "@/api/transforms/video";
import type { ApiVideoJob } from "@/api/types/video";
import type { VideoJob } from "@/types/video";
import { getErrorMessage, isAbortError } from "@/utils";

export const useVideoJobs = () => {
	const [jobs, setJobs] = useState<VideoJob[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchJobs = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<ApiVideoJob[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/video/jobs`,
				{ method: "GET", signal },
			);
			setJobs(toVideoJobs(response));
		} catch (err: unknown) {
			if (isAbortError(err)) {
				console.debug("Request was aborted.");
			} else {
				setError(getErrorMessage(err));
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchJobs(controller.signal);
		return () => controller.abort();
	}, [fetchJobs]);

	useEffect(() => {
		const controller = new AbortController();
		fetchJobs(controller.signal);
		return () => controller.abort();
	}, [fetchJobs]);

	return { jobs, loading, error, refetch };
};
