import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ErrorState } from "@/components/error/error";
import { useGetCheckoutSession } from "@/hooks/useGetCheckoutSession";
import { Banner } from "@/proto-design-system/components/feedback/Banner";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";

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
			<div>
				<Banner
					type={"success"}
					variant={"filled"}
					title={"Joined!"}
					description={
						"We appreciate your business! A confirmation email will be sent to your email. "
					}
				/>
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
	const { session_id } = Route.useSearch();
	return <Page sessionId={session_id} />;
}
