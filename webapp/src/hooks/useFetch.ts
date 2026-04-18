/**
 * Generic Data Fetching Hook
 *
 * Eliminates boilerplate in data-fetching hooks by providing a reusable pattern
 * for fetch → transform → state management → error handling → abort cleanup.
 *
 * Used by: useGetPosts, useGetPost, useBlogPosts, useGetBlogPost, useAnalytics,
 * usePlatformConnections, useMedia, useGitHubRepos, useGitHubConnection,
 * useGitHubCommits, useVoiceProfile, useGetCurrentSubscription, useGetAllPrices,
 * useGetPostDetails, and more.
 */

import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export interface UseFetchResult<TDomain> {
	/** The transformed data, or null if loading/error/not-yet-fetched */
	data: TDomain | null;
	/** Whether a fetch is currently in progress */
	loading: boolean;
	/** User-friendly error message, or null if no error */
	error: string | null;
	/** Manually trigger a refetch with a fresh AbortController */
	refetch: () => void;
}

/**
 * Generic hook for fetching data, applying a transform, and managing state.
 *
 * @template TApi - Shape of raw API response
 * @template TDomain - Shape of transformed domain data
 *
 * @param url - URL to fetch from. If null, fetch is skipped (useful when waiting on an ID).
 * @param transform - Function to transform raw API response into domain shape.
 * @param deps - Optional dependency array passed to useCallback/useEffect.
 *              If omitted, defaults to [] (fetch once on mount).
 *              Include any values that should trigger a refetch when changed.
 *
 * @returns Object with { data, loading, error, refetch }
 *
 * @example
 * // Simple fetch with transform
 * const { data, loading, error } = useFetch<ApiPost, Post>(
 *   `${VITE_API_URL}/api/posts/${id}`,
 *   (raw) => toPost(raw),
 *   [id]
 * );
 *
 * @example
 * // Fetch skipped when ID is not available
 * const { data, loading, error } = useFetch<ApiPost, Post>(
 *   id ? `${VITE_API_URL}/api/posts/${id}` : null,
 *   (raw) => toPost(raw),
 *   [id]
 * );
 *
 * @example
 * // Fetch with filters that trigger refetch on change
 * const { data, loading, error, refetch } = useFetch<ApiPost[], Post[]>(
 *   `${VITE_API_URL}/api/posts?status=${filters.status}`,
 *   (raw) => toPosts(raw),
 *   [filters.status]
 * );
 */
export const useFetch = <TApi, TDomain>(
	url: string | null,
	transform: (raw: TApi) => TDomain,
	deps: unknown[] = [],
): UseFetchResult<TDomain> => {
	const [data, setData] = useState<TDomain | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Core fetch logic wrapped in useCallback to allow manual refetch and control deps
	const fetchData = useCallback(
		async (signal: AbortSignal) => {
			// Skip if URL is null (e.g., waiting for an ID from params)
			if (!url) {
				setData(null);
				setLoading(false);
				setError(null);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<TApi>(url, { signal });
				setData(transform(response));
			} catch (err: unknown) {
				// Don't set error if request was aborted (normal cleanup)
				if (!isAbortError(err)) {
					setError(getErrorMessage(err));
				}
			} finally {
				setLoading(false);
			}
		},
		// Include url and transform in deps to ensure fetchData updates when they change
		// Plus any custom deps passed by the caller
		[url, transform, ...deps],
	);

	// Automatic fetch on mount and when fetchData changes
	useEffect(() => {
		const controller = new AbortController();
		fetchData(controller.signal);

		// Cleanup: abort pending request if component unmounts or deps change
		return () => controller.abort();
	}, [fetchData]);

	// Refetch callback: create a fresh AbortController and call fetchData
	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchData(controller.signal);
	}, [fetchData]);

	return { data, loading, error, refetch };
};
