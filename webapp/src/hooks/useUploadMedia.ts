import { useCallback, useState } from "react";
import { toMediaItem } from "@/api/transforms/media";
import type { ApiMediaItem } from "@/api/types/media";
import {
	getUploadErrorMessage,
	UPLOAD_TRANSPORT_ERROR_MESSAGE,
} from "@/config/mediaUploadErrors";
import type { MediaItem } from "@/types/media";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export const useUploadMedia = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const uploadMedia = useCallback(
		async (file: File, signal?: AbortSignal): Promise<MediaItem> => {
			setLoading(true);
			setError(null);

			try {
				const formData = new FormData();
				formData.append("file", file);

				let response: Response;
				try {
					response = await fetch(
						`${import.meta.env.VITE_API_URL}/api/protected/media`,
						{
							method: "POST",
							credentials: "include",
							body: formData,
							signal,
						},
					);
				} catch (fetchErr: unknown) {
					if (isAbortError(fetchErr)) {
						throw fetchErr;
					}
					throw new Error(UPLOAD_TRANSPORT_ERROR_MESSAGE);
				}

				if (!response.ok) {
					throw new Error(getUploadErrorMessage(response.status));
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
		},
		[],
	);

	return { uploadMedia, loading, error };
};
