import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import type { PlatformConnection } from "@/types/platform";
import { getErrorMessage, isAbortError } from "@/utils";

export const usePlatformConnections = () => {
	const [connections, setConnections] = useState<PlatformConnection[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchConnections = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<PlatformConnection[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/platforms`,
				{ method: "GET", signal },
			);
			setConnections(response);
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
		fetchConnections(controller.signal);
		return () => controller.abort();
	}, [fetchConnections]);

	useEffect(() => {
		const controller = new AbortController();
		fetchConnections(controller.signal);
		return () => controller.abort();
	}, [fetchConnections]);

	return { connections, loading, error, refetch };
};
