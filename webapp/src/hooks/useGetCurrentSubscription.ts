import { useCallback, useEffect, useState } from "react";
import {
	type ApiError,
	type ApiSubscription,
	fetcher,
	toUiSubscription,
} from "@/api";
import type { Subscription } from "@/types/billing";
import { toApiError } from "@/utils";

async function getCurrentSubscription(): Promise<Subscription> {
	const response = await fetcher<ApiSubscription>(
		`${import.meta.env.VITE_API_URL}/api/protected/billing/subscription`,
		{
			method: "GET",
		},
	);
	return toUiSubscription(response);
}

export const useGetCurrentSubscription = () => {
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<ApiError | null>(null);
	const [currentSubscription, setCurrentSubscription] =
		useState<Subscription>();

	const getCurrentSubscriptionCallback =
		useCallback(async (): Promise<void> => {
			setLoading(true);
			try {
				const response = await getCurrentSubscription();
				setCurrentSubscription(response);
			} catch (error: unknown) {
				setError(toApiError(error));
			} finally {
				setLoading(false);
			}
		}, []);

	useEffect(() => {
		getCurrentSubscriptionCallback();
	}, [getCurrentSubscriptionCallback]);

	return {
		refetch: getCurrentSubscriptionCallback,
		loading,
		error,
		currentSubscription,
	};
};
