import { useCallback, useEffect, useRef, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoJob } from "@/api/transforms/video";
import type { ApiVideoJob } from "@/api/types/video";
import type { VideoJob } from "@/types/video";
import { getErrorMessage, isAbortError } from "@/utils";

export const useVideoJob = (jobId: string | null) => {
	const [job, setJob] = useState<VideoJob | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchJob = useCallback(
		async (signal: AbortSignal) => {
			if (!jobId) return;
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVideoJob>(
					`${import.meta.env.VITE_API_URL}/api/protected/video/jobs/${jobId}`,
					{ method: "GET", signal },
				);
				const transformed = toVideoJob(response);
				setJob(transformed);

				// Stop polling if terminal state
				if (
					transformed.status === "completed" ||
					transformed.status === "failed"
				) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
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
		[jobId],
	);

	useEffect(() => {
		if (!jobId) return;

		const controller = new AbortController();
		fetchJob(controller.signal);

		// Poll every 3 seconds
		intervalRef.current = setInterval(() => {
			const innerController = new AbortController();
			fetchJob(innerController.signal);
		}, 3000);

		return () => {
			controller.abort();
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [fetchJob, jobId]);

	return { job, loading, error };
};
