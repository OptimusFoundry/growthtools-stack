import { Alert, Spinner } from "@optimusfoundry/quiet";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import CustomCheckout from "@/components/billing/checkout/CustomCheckout";
import { ErrorState } from "@/components/error/error";
import { useCreateCheckoutSession } from "@/hooks/useCreateCheckoutSession";

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
			<Alert variant="error" title="Error">
				Unable to initiate payment process
			</Alert>
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
