import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/features/billing/components/BillingPage/component";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export const Route = createFileRoute("/billing/")({
	component: RouteComponent,
});

function RouteComponent() {
	useDocumentTitle("Billing");
	return <BillingPage />;
}
