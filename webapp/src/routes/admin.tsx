import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetcher } from "@/api/client";
import type { ApiAdminUser } from "@/api/types/user";
import { AdminPage } from "@/features/admin/AdminPage";

/**
 * Admin route — gated server-side.
 * beforeLoad probes GET /api/protected/admin/users; any 403 response redirects
 * to "/" so non-admins never see the page. All other errors (5xx, network) are
 * surfaced as an error boundary rather than a silent redirect.
 */
export const Route = createFileRoute("/admin")({
	beforeLoad: async () => {
		try {
			await fetcher<ApiAdminUser[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/admin/users`,
				{ method: "GET" },
			);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message.toLowerCase() : "";
			if (message.includes("forbidden") || message.includes("403")) {
				throw redirect({ to: "/" });
			}
			// Other errors (5xx, network) bubble up to error boundary.
			throw err;
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <AdminPage />;
}
