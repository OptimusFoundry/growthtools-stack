import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/error/error";
import { Layout } from "@/components/Layout/Layout";
import { useAuth } from "@/contexts/auth";

function isPublicRoute(): boolean {
	if (typeof window === "undefined") return false;
	const path = window.location.pathname;
	return (
		path === "/signin" || path.startsWith("/oauth") || path.startsWith("/test-")
	);
}

function RootLayout() {
	const auth = useAuth();

	if (isPublicRoute()) {
		if (auth.isLoggedIn) {
			if (typeof window !== "undefined") {
				window.location.replace("/");
			}
			return null;
		}
		return <Outlet />;
	}

	return (
		<Layout>
			<Outlet />
		</Layout>
	);
}

export const rootRoute = createRootRouteWithContext()({
	component: RootLayout,
	errorComponent: ErrorBoundary,
});

export const Route = rootRoute;
