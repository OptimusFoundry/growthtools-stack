// /oauth/signedin page at root for TanStack Router
import { PageHero, PageShell } from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function OAuthSignedInPage() {
	useDocumentTitle("Signed in");
	return (
		<PageShell
			narrow
			as="main"
			header={
				<PageHero
					size="md"
					ruled={false}
					title="Signed in"
					description="You are signed in."
				/>
			}
		/>
	);
}

export const Route = createFileRoute("/oauth/signedin")({
	component: OAuthSignedInPage,
});
