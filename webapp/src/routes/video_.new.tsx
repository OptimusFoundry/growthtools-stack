import { createFileRoute } from "@tanstack/react-router";
import { CreateVideoWizard } from "@/components/create-video/CreateVideoWizard";

export const Route = createFileRoute("/video_/new")({
	component: CreateVideoWizard,
});
