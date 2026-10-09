// /signin page at root for TanStack Router
import { PageShell, Stack, Text } from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import Login from "@/components/authentication/login";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import styles from "./signin.module.scss";

function SignInPage() {
	useDocumentTitle("Sign in");
	return (
		<PageShell narrow as="main">
			<div className={styles.container}>
				<Stack gap="lg">
					<Text as="h1" heading={4}>
						Welcome
					</Text>
					<Login />
				</Stack>
			</div>
		</PageShell>
	);
}

export const Route = createFileRoute("/signin")({
	component: SignInPage,
});
