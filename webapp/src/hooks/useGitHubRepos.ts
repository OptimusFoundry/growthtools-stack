import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage, isAbortError } from "@/utils";

export interface GitHubAvailableRepo {
	id: number;
	name: string;
	full_name: string;
	owner: { login: string };
	default_branch: string;
	private: boolean;
	connected: boolean;
}

export const useGitHubRepos = (enabled: boolean) => {
	const [repos, setRepos] = useState<GitHubAvailableRepo[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchRepos = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetcher<GitHubAvailableRepo[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/github/repos`,
				{ method: "GET", signal },
			);
			setRepos(Array.isArray(response) ? response : []);
		} catch (err: unknown) {
			if (isAbortError(err)) return;
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, []);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchRepos(controller.signal);
		return () => controller.abort();
	}, [fetchRepos]);

	useEffect(() => {
		if (!enabled) return;
		const controller = new AbortController();
		fetchRepos(controller.signal);
		return () => controller.abort();
	}, [enabled, fetchRepos]);

	return { repos, loading, error, refetch };
};
