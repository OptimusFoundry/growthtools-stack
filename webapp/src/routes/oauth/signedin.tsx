// /oauth/signedin page at root for TanStack Router
import { PageHero, PageShell } from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";

function OAuthSignedInPage() {
	return (
		<PageShell
			narrow
			as="main"
			header={
				<PageHero
					size="md"
					as="h2"
					ruled={false}
					title={trimTrailingPeriod("OAuth Signed In")}
					description="You have successfully signed in with OAuth."
				/>
			}
		/>
	);
}

export const Route = createFileRoute("/oauth/signedin")({
	component: OAuthSignedInPage,
});
