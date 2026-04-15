import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import type { ApiRefinementMessage, RefinementMessage } from "@/types/video";

function toRefinementMessage(api: ApiRefinementMessage): RefinementMessage {
	return {
		id: api.id,
		videoConfigId: api.video_config_id,
		accountId: api.account_id,
		role: api.role,
		content: api.content,
		createdAt: api.created_at,
	};
}

export function useRefinementMessages(configId: string | undefined) {
	const [messages, setMessages] = useState<RefinementMessage[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchMessages = useCallback(async () => {
		if (!configId) return;
		setLoading(true);
		setError(null);
		try {
			const response = await fetcher<ApiRefinementMessage[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${configId}/refine/messages`,
			);
			setMessages(response.map(toRefinementMessage));
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to load messages";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [configId]);

	useEffect(() => {
		fetchMessages();
	}, [fetchMessages]);

	return { messages, loading, error, refetch: fetchMessages };
}
