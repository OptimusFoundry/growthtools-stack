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

interface ListCommitsResponse {
	commits: GitHubCommit[];
	total: number;
	limit: number;
	offset: number;
}

interface UseGitHubCommitsResult {
	commits: GitHubCommit[];
	total: number;
	loading: boolean;
	error: string | null;
	refetch: () => void;
	/** Current page (1-indexed) — only meaningful when a page is set via setPage. */
	page: number;
	setPage: (page: number) => void;
}

/**
 * Fetches a page of GitHub commits. Defaults to page 1 with the given limit.
 * The server returns {commits, total, limit, offset} so callers can drive a
 * Pagination component with totalPages = ceil(total / limit).
 */
export const useGitHubCommits = (
	enabled: boolean,
	limit = 10,
): UseGitHubCommitsResult => {
	const [commits, setCommits] = useState<GitHubCommit[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [page, setPage] = useState<number>(1);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCommits = useCallback(
		async (signal: AbortSignal, targetPage: number) => {
			setLoading(true);
			setError(null);
			const offset = Math.max(0, (targetPage - 1) * limit);
			try {
				const response = await fetcher<ListCommitsResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/github/commits?limit=${limit}&offset=${offset}`,
					{ method: "GET", signal },
				);
				setCommits(Array.isArray(response.commits) ? response.commits : []);
				setTotal(typeof response.total === "number" ? response.total : 0);
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
		fetchCommits(controller.signal, page);
		return () => controller.abort();
	}, [fetchCommits, page]);

	useEffect(() => {
		if (!enabled) return;
		const controller = new AbortController();
		fetchCommits(controller.signal, page);
		return () => controller.abort();
	}, [enabled, fetchCommits, page]);

	return { commits, total, loading, error, refetch, page, setPage };
};
