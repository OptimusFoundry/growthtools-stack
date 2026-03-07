import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toVoiceProfile } from "@/api/transforms/voiceProfile";
import type { ApiVoiceProfile } from "@/api/types/voiceProfile";
import type {
	UpdateVoiceProfileRequest,
	VoiceProfile,
} from "@/types/voiceProfile";
import { getErrorMessage, isAbortError } from "@/utils";

export const useVoiceProfile = () => {
	const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchVoiceProfile = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<ApiVoiceProfile>(
				`${import.meta.env.VITE_API_URL}/api/protected/settings/voice`,
				{ method: "GET", signal },
			);
			setVoiceProfile(toVoiceProfile(response));
		} catch (err: unknown) {
			if (isAbortError(err)) {
				console.debug("Request was aborted.");
			} else {
				setError(getErrorMessage(err));
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const updateVoiceProfile = useCallback(
		async (data: UpdateVoiceProfileRequest): Promise<VoiceProfile> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiVoiceProfile>(
					`${import.meta.env.VITE_API_URL}/api/protected/settings/voice`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
					},
				);
				const profile = toVoiceProfile(response);
				setVoiceProfile(profile);
				return profile;
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

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchVoiceProfile(controller.signal);
		return () => controller.abort();
	}, [fetchVoiceProfile]);

	useEffect(() => {
		const controller = new AbortController();
		fetchVoiceProfile(controller.signal);
		return () => controller.abort();
	}, [fetchVoiceProfile]);

	return { voiceProfile, loading, error, updateVoiceProfile, refetch };
};
