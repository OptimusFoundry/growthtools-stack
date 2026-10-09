import { Alert, Spinner, Stack, Text } from "@optimusfoundry/quiet";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ErrorState } from "@/components/error/error";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGetCheckoutSession } from "@/hooks/useGetCheckoutSession";
import styles from "./payment_attempt.module.scss";

interface Props {
	sessionId: string;
}

function Page(props: Props) {
	const navigate = useNavigate();
	const { error, loading, data } = useGetCheckoutSession({
		sessionID: props.sessionId!,
	});

	if (loading) {
		return <Spinner />;
	}

	if (error) {
		return <ErrorState message={`Something went wrong: ${error.error}`} />;
	}

	if (data.status === "open") {
		navigate({ to: "/billing/pay" });
		return null;
	}

	if (data.status === "complete") {
		return (
			<div className={styles.column}>
				<Stack gap="sm">
					<Text as="h1" size="xl" weight="semibold">
						Joined!
					</Text>
					<Alert variant="success">
						We appreciate your business! A confirmation email will be sent to
						your email.
					</Alert>
				</Stack>
			</div>
		);
	}

	return null;
}

export const Route = createFileRoute("/billing/payment_attempt")({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			session_id: (search.session_id as string) || "",
		};
	},
});

function RouteComponent() {
	useDocumentTitle("Payment");
	const { session_id } = Route.useSearch();
	return <Page sessionId={session_id} />;
}
