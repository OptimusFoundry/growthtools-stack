import { useCallback, useState } from "react";
import { fetcher } from "@/api";
import { CancelSubscriptionResponse } from "@/types/billing";
import { getErrorMessage } from "@/utils";

async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
	const response = await fetcher<CancelSubscriptionResponse>(
		`${import.meta.env.VITE_API_URL}/api/protected/billing/cancel-subscription`,
		{
			method: "DELETE",
		},
	);

	return response;
}

export const useCancelSubscription = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<CancelSubscriptionResponse>();

	const cancelSubscriptionCallback = useCallback(async (): Promise<void> => {
		setLoading(true);
		try {
			const response = await cancelSubscription();
			setData(response);
		} catch (error: unknown) {
			setError(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		cancelSubscription: cancelSubscriptionCallback,
		loading,
		error,
		data,
	};
};
