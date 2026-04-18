import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import type { PlatformType } from "@/types/platform";
import { getErrorMessage } from "@/utils/errorHandler";

interface ConnectPlatformResponse {
	auth_url: string;
}

export const useConnectPlatform = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const connectPlatform = useCallback(
		async (platform: PlatformType): Promise<ConnectPlatformResponse> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ConnectPlatformResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/platforms/oauth/init`,
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

	return { connectPlatform, loading, error };
};
