import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/Layout/Topbar";
import { HelpPage } from "@/features/help/components/HelpPage/component";
import { HELP_COPY } from "@/features/help/copy";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export const Route = createFileRoute("/help")({
	component: HelpRoute,
});

function HelpRoute() {
	useDocumentTitle("Help");
	return (
		<>
			<Topbar title={HELP_COPY.title} />
			<HelpPage />
		</>
	);
}
