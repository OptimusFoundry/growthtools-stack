import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api";
import { CustomerPortalResponse } from "@/types/billing";
import { getErrorMessage } from "@/utils";

async function createCustomerPortal(): Promise<CustomerPortalResponse> {
	const resp = await fetcher<CustomerPortalResponse>(
		`${import.meta.env.VITE_API_URL}/api/protected/billing/create-customer-portal`,
		{
			method: "POST",
		},
	);

	return resp;
}

export const useCreateCustomerPortal = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<CustomerPortalResponse>();

	const createCustomerPortalCallback = useCallback(async () => {
		setLoading(true);
		try {
			const response = await createCustomerPortal();
			setData(response);
		} catch (error: unknown) {
			setError(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		createCustomerPortalCallback();
	}, [createCustomerPortalCallback]);

	return { loading, error, data };
};
