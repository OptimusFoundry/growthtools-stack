import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import type { MediaItem } from "@/types/media";
import { getErrorMessage, isAbortError } from "@/utils";

interface MediaFilters {
	limit?: number;
	offset?: number;
}

export const useMedia = (filters?: MediaFilters) => {
	const [media, setMedia] = useState<MediaItem[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchMedia = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams();
				if (filters?.limit !== undefined) params.set("limit", String(filters.limit));
				if (filters?.offset !== undefined) params.set("offset", String(filters.offset));

				const query = params.toString();
				const url = `${import.meta.env.VITE_API_URL}/api/protected/media${query ? `?${query}` : ""}`;

				const response = await fetcher<MediaItem[]>(url, { method: "GET", signal });
				setMedia(response);
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
		[filters?.limit, filters?.offset],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchMedia(controller.signal);
		return () => controller.abort();
	}, [fetchMedia]);

	useEffect(() => {
		const controller = new AbortController();
		fetchMedia(controller.signal);
		return () => controller.abort();
	}, [fetchMedia]);

	return { media, loading, error, refetch };
};
