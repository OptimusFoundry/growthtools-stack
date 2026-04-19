import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";

interface UseStartImpersonationResult {
	start: (targetUserId: string) => Promise<void>;
	isLoading: boolean;
	error: string | null;
}

/**
 * Calls POST /api/protected/admin/impersonate/:user_id.
 * On success triggers a full page reload to flush all cached state.
 */
export function useStartImpersonation(): UseStartImpersonationResult {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const start = useCallback(async (targetUserId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			await fetcher(
				`${import.meta.env.VITE_API_URL}/api/protected/admin/impersonate/${encodeURIComponent(targetUserId)}`,
				{ method: "POST" },
			);
			// Full page reload flushes all in-memory state (TanStack Query caches, etc.)
			window.location.assign("/");
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to start impersonation";
			setError(message);
			setIsLoading(false);
		}
	}, []);

	return { start, isLoading, error };
}
