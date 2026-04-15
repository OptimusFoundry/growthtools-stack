import { useCallback, useRef, useState } from "react";
import { fetcher } from "@/api/client";
import { toVideoConfig } from "@/api/transforms/video";
import type { ApiVideoConfig } from "@/api/types/video";
import type {
	UpdateVideoConfigRequest,
	VideoConfig,
	VideoConfigData,
} from "@/types/video";
import { getErrorMessage } from "@/utils";

export const useUpdateVideoConfig = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const updateConfig = useCallback(
		async (
			configId: string,
			params: UpdateVideoConfigRequest,
		): Promise<VideoConfig> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVideoConfig>(
					`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${configId}`,
					{
						method: "PUT",
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

	return { updateConfig, loading, error };
};

/** Debounced variant — auto-saves config changes after 500ms idle */
const DEBOUNCE_MS = 500;

export function useDebouncedConfigSave() {
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const saveConfig = useCallback(
		(configId: string, configData: VideoConfigData) => {
			clearTimeout(timerRef.current);

			timerRef.current = setTimeout(async () => {
				try {
					await fetcher<ApiVideoConfig>(
						`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${configId}`,
						{
							method: "PUT",
							body: JSON.stringify({ config: configData }),
						},
					);
				} catch (err) {
					console.error("Failed to auto-save config:", err);
				}
			}, DEBOUNCE_MS);
		},
		[],
	);

	return { saveConfig };
}
