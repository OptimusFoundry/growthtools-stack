import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback } from "react";
import {
	BlogPostForm,
	type BlogPostFormData,
} from "@/components/blog/BlogPostForm";
import { useCreateBlogPost } from "@/hooks/useCreateBlogPost";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Container } from "@/proto-design-system/components/layout/Container";
import styles from "./editor.module.scss";

export const Route = createFileRoute("/blog_/new")({
	component: NewBlogPostPage,
});

function NewBlogPostPage() {
	const navigate = useNavigate();
	const { createBlogPost, loading: creating, error } = useCreateBlogPost();
	const { publishBlog, loading: publishing } = usePublishBlog();

	const handleSaveDraft = useCallback(
		async (data: BlogPostFormData) => {
			await createBlogPost({
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				status: "draft",
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords ? data.keywords.split(", ") : undefined,
				og_title: data.ogTitle || undefined,
				og_description: data.ogDescription || undefined,
			});
			navigate({ to: "/blog" });
		},
		[createBlogPost, navigate],
	);

	const handlePublish = useCallback(
		async (data: BlogPostFormData) => {
			const post = await createBlogPost({
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				status: "draft",
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords ? data.keywords.split(", ") : undefined,
				og_title: data.ogTitle || undefined,
				og_description: data.ogDescription || undefined,
			});
			await publishBlog(post.id);
			navigate({ to: "/blog" });
		},
		[createBlogPost, publishBlog, navigate],
	);

	if (error) {
		return (
			<Container>
				<Alert variant="error" title="Something went wrong">
					{error}
				</Alert>
			</Container>
		);
	}

	return (
		<motion.div
			className={styles.editor}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<Link to="/blog" style={{ textDecoration: "none" }}>
					New Post
				</Link>
			</div>
			<BlogPostForm
				onSaveDraft={handleSaveDraft}
				onPublish={handlePublish}
				loading={creating || publishing}
			/>
		</motion.div>
	);
}
