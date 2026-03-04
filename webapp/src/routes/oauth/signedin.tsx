// /oauth/signedin page at root for TanStack Router
import { createFileRoute } from "@tanstack/react-router";

function OAuthSignedInPage() {
	console.log("OAuthSignedInPage");
	return (
		<div>
			<h2>OAuth Signed In</h2>
			<p>You have successfully signed in with OAuth.</p>
		</div>
	);
}

export const Route = createFileRoute("/oauth/signedin")({
	component: OAuthSignedInPage,
});
