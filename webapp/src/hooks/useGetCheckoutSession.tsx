import { useCallback, useEffect, useState } from "react";
import { type ApiError, fetcher } from "@/api";
import { toApiError } from "@/utils";

interface GetCheckoutSessionResponse {
	session_id: string;
	status: string;
	payment_status: string;
}

interface IArguments {
	sessionID: string;
}

export const useGetCheckoutSession = (args: IArguments) => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<ApiError | null>(null);
	const [data, setData] = useState<GetCheckoutSessionResponse>(
		{} as GetCheckoutSessionResponse,
	);

	const getCheckoutSession = useCallback(
		async (session_id: string): Promise<void> => {
			setLoading(true);
			try {
				const response = await fetcher<GetCheckoutSessionResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/billing/checkout-session?session_id=${session_id}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
						},
					},
				);

				setData(response);
			} catch (error: unknown) {
				setError(toApiError(error));
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		if (args.sessionID) {
			getCheckoutSession(args.sessionID);
		}
	}, [args.sessionID, getCheckoutSession]);

	return {
		refetch: getCheckoutSession,
		loading,
		error,
		data,
	};
};
