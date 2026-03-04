import { createFileRoute, useSearch } from "@tanstack/react-router";
import CustomCheckout from "@/components/billing/checkout/CustomCheckout";
import { ErrorState } from "@/components/error/error";
import { useCreateCheckoutSession } from "@/hooks/useCreateCheckoutSession";
import { Banner } from "@/proto-design-system/components/feedback/Banner";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";

export const Route = createFileRoute("/billing/pay")({
	component: RouteComponent,
});

interface Props {
	plan: string;
}

function PaymentPage(props: Props) {
	const { clientSecret, loading, error } = useCreateCheckoutSession({
		priceId: props.plan,
	});

	if (loading) {
		return <Spinner />;
	}

	if (error) {
		return <ErrorState message={`Something went wrong: ${error.error}`} />;
	}

	if (!clientSecret) {
		return (
			<Banner
				type="error"
				variant="filled"
				title="Error"
				description="Unable to initiate payment process"
			/>
		);
	}

	return <CustomCheckout clientSecret={clientSecret} />;
}

function RouteComponent() {
	const search: { plan: string } = useSearch({ from: "/billing/pay" });
	if (!search || !search.plan) {
		return <ErrorState message="Missing plan parameter in URL" />;
	}
	return <PaymentPage plan={search.plan} />;
}
