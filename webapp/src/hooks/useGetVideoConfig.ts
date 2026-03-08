import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoConfig } from "@/api/transforms/video";
import type { ApiVideoConfig } from "@/api/types/video";
import type { VideoConfig } from "@/types/video";
import { getErrorMessage, isAbortError } from "@/utils";

export const useGetVideoConfig = (id: string | undefined) => {
	const [config, setConfig] = useState<VideoConfig | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchConfig = useCallback(
		async (signal: AbortSignal) => {
			if (!id) return;

			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVideoConfig>(
					`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${id}`,
					{ method: "GET", signal },
				);
				setConfig(toVideoConfig(response));
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
		[id],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchConfig(controller.signal);
		return () => controller.abort();
	}, [fetchConfig]);

	useEffect(() => {
		const controller = new AbortController();
		fetchConfig(controller.signal);
		return () => controller.abort();
	}, [fetchConfig]);

	return { config, loading, error, refetch };
};
