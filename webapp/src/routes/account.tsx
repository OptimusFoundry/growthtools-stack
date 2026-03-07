import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/features/account/components/AccountPage/component";

type AccountSearch = {
	tab?: string;
};

export const Route = createFileRoute("/account")({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>): AccountSearch => ({
		tab: typeof search.tab === "string" ? search.tab : undefined,
	}),
});

function RouteComponent() {
	return <AccountPage />;
}
