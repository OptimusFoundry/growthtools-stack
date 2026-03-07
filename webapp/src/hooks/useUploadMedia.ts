import { useCallback, useState } from "react";
import { toMediaItem } from "@/api/transforms/media";
import type { ApiMediaItem } from "@/api/types/media";
import type { MediaItem } from "@/types/media";
import { getErrorMessage } from "@/utils";

export const useUploadMedia = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const uploadMedia = useCallback(async (file: File): Promise<MediaItem> => {
		setLoading(true);
		setError(null);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/api/protected/media`,
				{
					method: "POST",
					credentials: "include",
					body: formData,
				},
			);

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || `Upload failed with status ${response.status}`);
			}

			const data: ApiMediaItem = await response.json();
			return toMediaItem(data);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			setError(message);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return { uploadMedia, loading, error };
};
