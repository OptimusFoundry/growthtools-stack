import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import type { PlatformConnection } from "@/types/platform";
import { getErrorMessage } from "@/utils";

export const useConnectWithToken = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const connectWithToken = useCallback(
		async (platform: string): Promise<PlatformConnection> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<PlatformConnection>(
					`${import.meta.env.VITE_API_URL}/api/protected/platforms/token`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ platform }),
					},
				);
				return response;
			} catch (err: unknown) {
				const message = getErrorMessage(err);
				setError(message);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	return { connectWithToken, loading, error };
};
