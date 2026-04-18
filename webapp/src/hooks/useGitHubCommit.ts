import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import type { GitHubCommit } from "@/hooks/useGitHubCommits";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

/**
 * Fetches a single commit with the full capture_output (including presigned
 * artifact URLs). The list endpoint returns a lightweight summary without
 * capture_output, so the detail page has to call this to render media.
 */
export const useGitHubCommit = (id: string | undefined) => {
	const [commit, setCommit] = useState<GitHubCommit | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCommit = useCallback(
		async (signal: AbortSignal) => {
			if (!id) return;
			setLoading(true);
			setError(null);
			try {
				const response = await fetcher<GitHubCommit>(
					`${import.meta.env.VITE_API_URL}/api/protected/github/commits/${id}`,
					{ method: "GET", signal },
				);
				setCommit(response);
			} catch (err: unknown) {
				if (isAbortError(err)) return;
				setError(getErrorMessage(err));
			} finally {
				setLoading(false);
			}
		},
		[id],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchCommit(controller.signal);
		return () => controller.abort();
	}, [fetchCommit]);

	useEffect(() => {
		const controller = new AbortController();
		fetchCommit(controller.signal);
		return () => controller.abort();
	}, [fetchCommit]);

	return { commit, loading, error, refetch };
};
