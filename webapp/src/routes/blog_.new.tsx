import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { Topbar } from "@/components/Layout/Topbar";

export const Route = createFileRoute("/blog_/new")({
	component: NewBlogPostPage,
});

function NewBlogPostPage() {
	return (
		<>
			<Topbar
				breadcrumbs={[{ label: "Blog", href: "/blog" }, { label: "New post" }]}
			/>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.6 }}
			>
				<BlogEditor />
			</motion.div>
		</>
	);
}
