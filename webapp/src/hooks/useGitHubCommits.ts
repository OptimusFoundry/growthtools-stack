import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage, isAbortError } from "@/utils";

export interface GitHubCaptureUploaded {
	key: string;
	url?: string | null;
}

export interface GitHubCaptureOutput {
	// Success payload
	commit?: string;
	captureDir?: string;
	stepCount?: number;
	uploaded?: GitHubCaptureUploaded[];
	// Error payload (we stash { error } on failure)
	error?: string;
}

export interface GitHubCommit {
	id: string;
	repo_id: string;
	sha: string;
	author_name?: string;
	author_email?: string;
	message: string;
	branch?: string;
	commit_url?: string;
	pushed_at: string;
	created_at: string;
	post_id?: string;
	capture_output?: GitHubCaptureOutput;
	capture_requested_at?: string;
	processed_at?: string;
	repo_owner?: string;
	repo_name?: string;
}

export const useGitHubCommits = (enabled: boolean, limit = 10) => {
	const [commits, setCommits] = useState<GitHubCommit[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCommits = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetcher<GitHubCommit[]>(
					`${import.meta.env.VITE_API_URL}/api/protected/github/commits?limit=${limit}`,
					{ method: "GET", signal },
				);
				setCommits(Array.isArray(response) ? response : []);
			} catch (err: unknown) {
				if (isAbortError(err)) return;
				setError(getErrorMessage(err));
			} finally {
				setLoading(false);
			}
		},
		[limit],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchCommits(controller.signal);
		return () => controller.abort();
	}, [fetchCommits]);

	useEffect(() => {
		if (!enabled) return;
		const controller = new AbortController();
		fetchCommits(controller.signal);
		return () => controller.abort();
	}, [enabled, fetchCommits]);

	return { commits, loading, error, refetch };
};
