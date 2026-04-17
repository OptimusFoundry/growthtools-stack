import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/features/account/components/AccountPage/component";

type AccountSearch = {
	tab?: string;
	github?: "connected" | "error";
};

export const Route = createFileRoute("/account")({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>): AccountSearch => ({
		tab: typeof search.tab === "string" ? search.tab : undefined,
		github:
			search.github === "connected" || search.github === "error"
				? search.github
				: undefined,
	}),
});

function RouteComponent() {
	return <AccountPage />;
}
