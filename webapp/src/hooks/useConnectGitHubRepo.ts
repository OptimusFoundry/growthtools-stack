import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

export const useConnectGitHubRepo = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const connectRepo = useCallback(async (owner: string, name: string) => {
		setLoading(true);
		setError(null);
		try {
			await fetcher<unknown>(
				`${import.meta.env.VITE_API_URL}/api/protected/github/repos/${encodeURIComponent(
					owner,
				)}/${encodeURIComponent(name)}/connect`,
				{ method: "POST" },
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			setError(message);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const disconnectRepo = useCallback(async (owner: string, name: string) => {
		setLoading(true);
		setError(null);
		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/github/repos/${encodeURIComponent(
					owner,
				)}/${encodeURIComponent(name)}`,
				{ method: "DELETE" },
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			setError(message);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return { connectRepo, disconnectRepo, loading, error };
};
