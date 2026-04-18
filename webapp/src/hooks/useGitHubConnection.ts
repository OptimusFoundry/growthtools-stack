import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export interface GitHubConnection {
	id: string;
	user_id: string;
	github_user_id: number;
	github_username: string;
	scope: string;
	created_at: string;
	updated_at: string;
}

export const useGitHubConnection = () => {
	const [connection, setConnection] = useState<GitHubConnection | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchConnection = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<GitHubConnection>(
				`${import.meta.env.VITE_API_URL}/api/protected/github/connection`,
				{ method: "GET", signal },
			);
			setConnection(response);
		} catch (err: unknown) {
			if (isAbortError(err)) {
				return;
			}
			const message = getErrorMessage(err);
			// 404 just means "not connected yet" — surface as null without an error banner
			if (message.toLowerCase().includes("not found")) {
				setConnection(null);
			} else {
				setError(message);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchConnection(controller.signal);
		return () => controller.abort();
	}, [fetchConnection]);

	useEffect(() => {
		const controller = new AbortController();
		fetchConnection(controller.signal);
		return () => controller.abort();
	}, [fetchConnection]);

	return { connection, loading, error, refetch };
};
