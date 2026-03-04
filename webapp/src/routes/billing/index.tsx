import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/features/billing/components/BillingPage/component";

export const Route = createFileRoute("/billing/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <BillingPage />;
}
