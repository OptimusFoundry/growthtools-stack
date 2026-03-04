import { useCallback, useEffect, useState } from "react";
import { type ApiError, fetcher } from "@/api";
import { toApiError } from "@/utils";

interface CreateCheckoutSessionResponse {
	client_secret: string;
}

interface IArguments {
	priceId: string;
}

export const useCreateCheckoutSession = (args: IArguments) => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<ApiError | null>(null);
	const [clientSecret, setClientSecret] = useState<string | null>(null);

	const createCheckoutSession = useCallback(
		async (price_id: string): Promise<void> => {
			setLoading(true);
			try {
				const response = await fetcher<CreateCheckoutSessionResponse>(
					`${import.meta.env.VITE_API_URL}/api/protected/billing/create-checkout-session`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ price_id }),
					},
				);

				// On successful response, set the client secret
				setClientSecret(response.client_secret);
			} catch (error: unknown) {
				setError(toApiError(error));
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		if (args.priceId) {
			createCheckoutSession(args.priceId);
		}
	}, [args.priceId, createCheckoutSession]);

	return {
		refetch: createCheckoutSession,
		loading,
		error,
		clientSecret,
	};
};
