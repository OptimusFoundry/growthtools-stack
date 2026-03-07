import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoConfigs } from "@/api/transforms/video";
import type { ApiVideoConfig } from "@/api/types/video";
import type { VideoConfig } from "@/types/video";
import { getErrorMessage, isAbortError } from "@/utils";

export const useVideoConfigs = () => {
	const [configs, setConfigs] = useState<VideoConfig[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchConfigs = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<ApiVideoConfig[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/video/configs`,
				{ method: "GET", signal },
			);
			setConfigs(toVideoConfigs(response));
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
		fetchConfigs(controller.signal);
		return () => controller.abort();
	}, [fetchConfigs]);

	useEffect(() => {
		const controller = new AbortController();
		fetchConfigs(controller.signal);
		return () => controller.abort();
	}, [fetchConfigs]);

	return { configs, loading, error, refetch };
};
