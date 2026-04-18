import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils/errorHandler";

export const useDisconnectPlatform = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const disconnectPlatform = useCallback(async (connectionId: string) => {
		setLoading(true);
		setError(null);

		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/platforms/${connectionId}`,
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

	return { disconnectPlatform, loading, error };
};
