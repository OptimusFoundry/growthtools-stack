import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useCallback, useEffect, useState } from "react";
import { type ApiPaymentMethodUpdateIntentResponse, fetcher } from "@/api";
import type { PaymentMethodUpdateIntentResponse } from "@/types/billing";
import { getErrorMessage } from "@/utils";

async function createPaymentMethodUpdateIntent(): Promise<PaymentMethodUpdateIntentResponse> {
	const response = await fetcher<ApiPaymentMethodUpdateIntentResponse>(
		`${import.meta.env.VITE_API_URL}/api/protected/billing/payment-method-update-intent`,
		{
			method: "POST",
		},
	);
	return {
		clientSecret: response.client_secret,
	};
}

export const useCreatePaymentMethodUpdateIntent = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<PaymentMethodUpdateIntentResponse>();
	const stripe = useStripe();
	const elements = useElements();

	const handlePaymentUpdate = useCallback(async () => {
		if (!stripe || !elements) {
			console.error("Stripe.js has not loaded yet.");
			return;
		}

		if (!data?.clientSecret) {
			setError("Client secret is missing");
			return;
		}

		const result = await stripe.confirmCardSetup(data.clientSecret, {
			payment_method: {
				card: elements.getElement(CardElement)!,
			},
		});

		if (result.error) {
			console.error(result.error.message);
			setError(result.error.message!);
		} else {
			console.log(result.setupIntent.payment_method);
		}
	}, [stripe, elements, data]);

	const createPaymentMethodUpdateIntentCallback =
		useCallback(async (): Promise<void> => {
			setLoading(true);
			try {
				const response = await createPaymentMethodUpdateIntent();
				setData(response);
			} catch (error: unknown) {
				setError(getErrorMessage(error));
			} finally {
				setLoading(false);
			}
		}, []);

	useEffect(() => {
		createPaymentMethodUpdateIntentCallback();
	}, [createPaymentMethodUpdateIntentCallback]);

	return {
		handlePaymentUpdate,
		loading,
		error,
		data,
	};
};
