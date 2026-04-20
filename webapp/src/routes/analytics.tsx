import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/features/analytics/components/AnalyticsPage/component";

export const Route = createFileRoute("/analytics")({
	validateSearch: (search: Record<string, unknown>) => {
		const range = search.range;
		if (range === "7d" || range === "30d" || range === "90d") {
			return { range } as { range: "7d" | "30d" | "90d" };
		}
		return {} as { range?: "7d" | "30d" | "90d" };
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <AnalyticsPage />;
}
