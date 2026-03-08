import { createFileRoute } from "@tanstack/react-router";
import { CreateVideoWizard } from "@/components/create-video/CreateVideoWizard";

export const Route = createFileRoute("/video_/$id")({
	component: EditVideoPage,
});

function EditVideoPage() {
	const { id } = Route.useParams();
	return <CreateVideoWizard editConfigId={id} />;
}
