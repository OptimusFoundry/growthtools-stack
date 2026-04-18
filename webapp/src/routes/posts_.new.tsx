import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CreatePostWizard } from "@/components/create-post/CreatePostWizard";
import { Topbar } from "@/components/Layout/Topbar";

export const Route = createFileRoute("/posts_/new")({
	component: NewPostPage,
});

function NewPostPage() {
	return (
		<>
			<Topbar
				breadcrumbs={[
					{ label: "Posts", href: "/posts" },
					{ label: "New post" },
				]}
			/>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.6 }}
			>
				<CreatePostWizard />
			</motion.div>
		</>
	);
}
