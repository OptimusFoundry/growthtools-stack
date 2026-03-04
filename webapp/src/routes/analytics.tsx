import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/features/analytics/components/AnalyticsPage/component";

export const Route = createFileRoute("/analytics")({
	component: RouteComponent,
});

function RouteComponent() {
	return <AnalyticsPage />;
}
