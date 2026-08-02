import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, fetcher } from "@/api/client";
import { toSitePublishTarget } from "@/api/transforms/sitePublishTarget";
import type { ApiSitePublishTarget } from "@/api/types/sitePublishTarget";
import type {
	SitePublishTarget,
	UpdateSitePublishTargetRequest,
} from "@/types/sitePublishTarget";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

// A 404 here means "not configured yet", not a failure — callers shouldn't
// have to special-case it themselves. Prefer the actual HTTP status (the
// backend's free-text error copy isn't a stable contract); fall back to a
// text match only if the error wasn't a typed ApiRequestError.
const isNotFoundError = (err: unknown, message: string): boolean => {
	if (err instanceof ApiRequestError) {
		return err.status === 404;
	}
	const lower = message.toLowerCase();
	return lower.includes("not found") || lower.includes("404");
};

export const useSitePublishTarget = () => {
	const [sitePublishTarget, setSitePublishTarget] =
		useState<SitePublishTarget | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchSitePublishTarget = useCallback(async (signal: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetcher<ApiSitePublishTarget>(
				`${import.meta.env.VITE_API_URL}/api/protected/settings/site-publish`,
				{ method: "GET", signal },
			);
			setSitePublishTarget(toSitePublishTarget(response));
		} catch (err: unknown) {
			if (isAbortError(err)) {
				console.debug("Request was aborted.");
			} else {
				const message = getErrorMessage(err);
				if (isNotFoundError(err, message)) {
					setSitePublishTarget(null);
				} else {
					setError(message);
				}
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const updateSitePublishTarget = useCallback(
		async (
			data: UpdateSitePublishTargetRequest,
		): Promise<SitePublishTarget> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetcher<ApiSitePublishTarget>(
					`${import.meta.env.VITE_API_URL}/api/protected/settings/site-publish`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
					},
				);
				const target = toSitePublishTarget(response);
				setSitePublishTarget(target);
				return target;
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
		fetchSitePublishTarget(controller.signal);
		return () => controller.abort();
	}, [fetchSitePublishTarget]);

	useEffect(() => {
		const controller = new AbortController();
		fetchSitePublishTarget(controller.signal);
		return () => controller.abort();
	}, [fetchSitePublishTarget]);

	return {
		sitePublishTarget,
		loading,
		error,
		updateSitePublishTarget,
		refetch,
	};
};
