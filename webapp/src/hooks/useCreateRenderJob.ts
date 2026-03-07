import { useCallback, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoJob } from "@/api/transforms/video";
import type { ApiVideoJob } from "@/api/types/video";
import type { VideoAspectRatio, VideoJob } from "@/types/video";
import { getErrorMessage } from "@/utils";

export const useCreateRenderJob = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const createRenderJob = useCallback(
		async (
			configId: string,
			aspectRatio: VideoAspectRatio,
		): Promise<VideoJob> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVideoJob>(
					`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${configId}/render`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ aspect_ratio: aspectRatio }),
					},
				);
				return toVideoJob(response);
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

	return { createRenderJob, loading, error };
};
