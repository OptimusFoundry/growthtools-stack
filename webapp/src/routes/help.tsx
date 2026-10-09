import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/Layout/Topbar";
import { HelpPage } from "@/features/help/components/HelpPage/component";
import { HELP_COPY } from "@/features/help/copy";

export const Route = createFileRoute("/help")({
	component: HelpRoute,
});

function HelpRoute() {
	return (
		<>
			<Topbar title={HELP_COPY.title} />
			<HelpPage />
		</>
	);
}
