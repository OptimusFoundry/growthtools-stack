import { useCallback, useEffect, useRef, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoJobs } from "@/api/transforms/video";
import type { ApiVideoJob } from "@/api/types/video";
import type { VideoJob } from "@/types/video";
import { getErrorMessage, isAbortError } from "@/utils";

/**
 * Fetches all video jobs for a given config ID.
 * Polls while any job is in a non-terminal state.
 */
export const useVideoJobsForConfig = (configId: string | undefined) => {
	const [jobs, setJobs] = useState<VideoJob[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchJobs = useCallback(
		async (signal: AbortSignal) => {
			if (!configId) return;
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVideoJob[]>(
					`${import.meta.env.VITE_API_URL}/api/protected/video/jobs?config_id=${configId}`,
					{ method: "GET", signal },
				);
				const parsed = toVideoJobs(response);
				setJobs(parsed);

				// Stop polling if all jobs are in terminal state
				const hasActiveJob = parsed.some(
					(j) => j.status !== "completed" && j.status !== "failed",
				);
				if (!hasActiveJob && intervalRef.current) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			} catch (err: unknown) {
				if (isAbortError(err)) {
					console.debug("Request was aborted.");
				} else {
					setError(getErrorMessage(err));
				}
			} finally {
				setLoading(false);
			}
		},
		[configId],
	);

	useEffect(() => {
		if (!configId) return;

		const controller = new AbortController();
		fetchJobs(controller.signal);

		return () => {
			controller.abort();
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [fetchJobs, configId]);

	/** Start polling — call after creating a new render job */
	const startPolling = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
		const controller = new AbortController();
		fetchJobs(controller.signal);
		intervalRef.current = setInterval(() => {
			const c = new AbortController();
			fetchJobs(c.signal);
		}, 3000);
	}, [fetchJobs]);

	return { jobs, loading, error, startPolling };
};
