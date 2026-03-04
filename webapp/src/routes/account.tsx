import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/features/account/components/AccountPage/component";

export const Route = createFileRoute("/account")({
	component: RouteComponent,
});

function RouteComponent() {
	return <AccountPage />;
}
