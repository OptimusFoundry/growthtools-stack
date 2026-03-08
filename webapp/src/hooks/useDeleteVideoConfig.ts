import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { getErrorMessage } from "@/utils";

export const useDeleteVideoConfig = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const deleteConfig = useCallback(async (id: string): Promise<void> => {
		setLoading(true);
		setError(null);

		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${id}`,
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

	return { deleteConfig, loading, error };
};
