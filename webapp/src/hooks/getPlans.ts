import { fetcher } from "@/api/client";
import type { ApiPriceResponse } from "@/api/types/billing";
import { toUiPrices } from "@/api/transforms/billing";
import type { Price } from "@/types/billing";

export async function getPlans(): Promise<Price[]> {
	const response = await fetcher<ApiPriceResponse>(
		`${import.meta.env.VITE_API_URL}/api/billing/plans`,
		{
			method: "GET",
		},
	);

	return toUiPrices(response);
}
