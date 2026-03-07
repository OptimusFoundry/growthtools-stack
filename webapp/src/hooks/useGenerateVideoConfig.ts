import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoConfig } from "@/api/transforms/video";
import type { ApiVideoConfig } from "@/api/types/video";
import type { GenerateVideoConfigRequest, VideoConfig } from "@/types/video";
import { getErrorMessage } from "@/utils";

export const useGenerateVideoConfig = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const generateConfig = useCallback(
		async (params: GenerateVideoConfigRequest): Promise<VideoConfig> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVideoConfig>(
					`${import.meta.env.VITE_API_URL}/api/protected/video/configs`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(params),
					},
				);
				return toVideoConfig(response);
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

	return { generateConfig, loading, error };
};
