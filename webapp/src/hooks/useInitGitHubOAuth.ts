import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

interface InitOAuthResponse {
	authorize_url: string;
}

export const useInitGitHubOAuth = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const initOAuth = useCallback(async (): Promise<string> => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetcher<InitOAuthResponse>(
				`${import.meta.env.VITE_API_URL}/api/protected/github/oauth/init`,
				{ method: "GET" },
			);
			return response.authorize_url;
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			setError(message);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return { initOAuth, loading, error };
};
