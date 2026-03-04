import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { AuthProvider, loadAuth } from "@/contexts/auth";
import { Providers } from "@/contexts/providers";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

async function main() {
	const user = await loadAuth();

	// Create a new router instance (no need to pass auth context)

	// Render the app for all routes (protected and public)
	const rootElement = document.getElementById("root")!;
	if (!rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<AuthProvider user={user}>
					<Providers>
						<RouterProvider router={router} />
					</Providers>
				</AuthProvider>
			</StrictMode>,
		);
	}
}

main();
