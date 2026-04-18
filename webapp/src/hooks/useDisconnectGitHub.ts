import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

export const useDisconnectGitHub = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const disconnect = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/github/connection`,
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

	return { disconnect, loading, error };
};
