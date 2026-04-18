import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback } from "react";
import {
	BlogPostForm,
	type BlogPostFormData,
} from "@/components/blog/BlogPostForm";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./editor.module.scss";

export const Route = createFileRoute("/blog_/$id")({
	component: EditBlogPostPage,
});

function EditBlogPostPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { blogPost, loading: fetching, error: fetchError } = useGetBlogPost(id);
	const { updateBlogPost, loading: updating } = useUpdateBlogPost();
	const { publishBlog, loading: publishing } = usePublishBlog();

	const handleSaveDraft = useCallback(
		async (data: BlogPostFormData) => {
			await updateBlogPost(id, {
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
		[id, updateBlogPost, navigate],
	);

	const handlePublish = useCallback(
		async (data: BlogPostFormData) => {
			await updateBlogPost(id, {
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords ? data.keywords.split(", ") : undefined,
				og_title: data.ogTitle || undefined,
				og_description: data.ogDescription || undefined,
			});
			await publishBlog(id);
			navigate({ to: "/blog" });
		},
		[id, updateBlogPost, publishBlog, navigate],
	);

	if (fetching) return <Spinner />;
	if (fetchError) return <Alert variant="error">{fetchError}</Alert>;

	const initialData = blogPost
		? {
				title: blogPost.title,
				slug: blogPost.slug,
				content: blogPost.content,
				excerpt: blogPost.excerpt || "",
				seoTitle: blogPost.seoTitle || "",
				metaDescription: blogPost.metaDescription || "",
				ogTitle: blogPost.ogTitle || "",
				ogDescription: blogPost.ogDescription || "",
				keywords: blogPost.keywords?.join(", ") || "",
			}
		: undefined;

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
					Edit Post
				</Link>
			</div>
			<BlogPostForm
				initialData={initialData}
				onSaveDraft={handleSaveDraft}
				onPublish={handlePublish}
				loading={updating || publishing}
			/>
		</motion.div>
	);
}
