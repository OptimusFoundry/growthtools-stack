import { useNavigate } from "@tanstack/react-router";
import "highlight.js/styles/github.css";
import { Edit, Globe, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import {
	BlogPostForm,
	type BlogPostFormData,
} from "@/components/blog/BlogPostForm";
import { useCreateBlogPost } from "@/hooks/useCreateBlogPost";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { useUpdateBlogPost } from "@/hooks/useUpdateBlogPost";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogPost } from "@/types/blog";
import styles from "./blog-editor.module.scss";

export interface BlogEditorProps {
	editPostId?: string;
}

function toFormData(bp: BlogPost): BlogPostFormData {
	return {
		title: bp.title,
		slug: bp.slug,
		content: bp.content,
		excerpt: bp.excerpt ?? "",
		seoTitle: bp.seoTitle ?? "",
		metaDescription: bp.metaDescription ?? "",
		ogTitle: bp.ogTitle ?? "",
		ogDescription: bp.ogDescription ?? "",
		keywords: bp.keywords.join(", "),
	};
}

// ── Create mode ──────────────────────────────────────────────────────────────

function CreateBlogEditor() {
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
			<Alert variant="error" title="Something went wrong">
				{error}
			</Alert>
		);
	}

	return (
		<BlogPostForm
			onSaveDraft={handleSaveDraft}
			onPublish={handlePublish}
			loading={creating || publishing}
		/>
	);
}

// ── Edit / View mode ──────────────────────────────────────────────────────────

function EditBlogEditor({ id }: { id: string }) {
	const navigate = useNavigate();
	const {
		blogPost,
		loading: fetching,
		error: fetchError,
		refetch,
	} = useGetBlogPost(id);
	const { publishBlog, loading: publishing } = usePublishBlog();
	const { deleteBlog, loading: deleting } = useDeleteBlog();
	const { updateBlogPost, loading: saving } = useUpdateBlogPost();

	const [isEditing, setIsEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const handlePublish = useCallback(async () => {
		await publishBlog(id);
		navigate({ to: "/blog" });
	}, [id, publishBlog, navigate]);

	const handleDelete = useCallback(async () => {
		await deleteBlog(id);
		setConfirmDelete(false);
		navigate({ to: "/blog" });
	}, [id, deleteBlog, navigate]);

	const handleSaveDraft = useCallback(
		async (data: BlogPostFormData) => {
			await updateBlogPost(id, {
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords
					? data.keywords
							.split(",")
							.map((k) => k.trim())
							.filter(Boolean)
					: undefined,
				og_title: data.ogTitle || undefined,
				og_description: data.ogDescription || undefined,
			});
			setIsEditing(false);
			refetch();
		},
		[id, updateBlogPost, refetch],
	);

	const handleSaveAndPublish = useCallback(
		async (data: BlogPostFormData) => {
			await updateBlogPost(id, {
				title: data.title,
				slug: data.slug,
				content: data.content,
				excerpt: data.excerpt || undefined,
				seo_title: data.seoTitle || undefined,
				meta_description: data.metaDescription || undefined,
				keywords: data.keywords
					? data.keywords
							.split(",")
							.map((k) => k.trim())
							.filter(Boolean)
					: undefined,
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
	if (!blogPost) return <Alert variant="warning">Blog post not found.</Alert>;

	if (isEditing) {
		return (
			<motion.div
				className={styles.editor}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<Stack gap="md">
					<Stack direction="row" justify="between" align="center" wrap>
						<Stack gap="xs">
							<Text as="h1" size="2xl" weight="bold">
								Edit blog post
							</Text>
							<Text size="sm" color="muted">
								/{blogPost.slug}
							</Text>
						</Stack>
						<Button
							variant="ghost"
							onClick={() => setIsEditing(false)}
							aria-label="Cancel edit"
						>
							<X size={16} /> Cancel
						</Button>
					</Stack>
					<BlogPostForm
						initialData={toFormData(blogPost)}
						onSaveDraft={handleSaveDraft}
						onPublish={handleSaveAndPublish}
						loading={saving || publishing}
					/>
				</Stack>
			</motion.div>
		);
	}

	return (
		<motion.div
			className={styles.editor}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4 }}
		>
			<Stack gap="md">
				<Stack direction="row" justify="between" align="start" wrap>
					<Stack gap="xs">
						<Stack direction="row" gap="sm" align="center">
							<Text as="h1" size="2xl" weight="bold">
								{blogPost.title}
							</Text>
							<Badge
								variant={
									blogPost.status === "published"
										? "success"
										: blogPost.status === "archived"
											? "secondary"
											: "default"
								}
							>
								{blogPost.status}
							</Badge>
						</Stack>
						<Text size="sm" color="muted">
							/{blogPost.slug}
						</Text>
						{blogPost.publishedAt && (
							<Text size="xs" color="muted">
								Published {new Date(blogPost.publishedAt).toLocaleString()}
							</Text>
						)}
					</Stack>
					<Stack direction="row" gap="sm">
						<Button variant="secondary" onClick={() => setIsEditing(true)}>
							<Edit size={16} /> Edit
						</Button>
						{blogPost.status !== "published" && (
							<Button
								variant="primary"
								onClick={handlePublish}
								isLoading={publishing}
							>
								<Globe size={16} /> Publish
							</Button>
						)}
						<Button
							variant="ghost"
							onClick={() => setConfirmDelete(true)}
							aria-label="Delete"
						>
							<Trash2 size={16} />
						</Button>
					</Stack>
				</Stack>

				{blogPost.excerpt && (
					<Text color="secondary" size="sm">
						{blogPost.excerpt}
					</Text>
				)}

				{blogPost.keywords.length > 0 && (
					<Stack direction="row" gap="xs" wrap>
						{blogPost.keywords.map((kw) => (
							<Badge key={kw} variant="outline" size="sm">
								{kw}
							</Badge>
						))}
					</Stack>
				)}

				<div className={styles.markdown}>
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						rehypePlugins={[rehypeHighlight]}
					>
						{blogPost.content}
					</ReactMarkdown>
				</div>
			</Stack>

			<Modal
				isOpen={confirmDelete}
				onClose={() => setConfirmDelete(false)}
				title="Delete blog post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setConfirmDelete(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				<Text color="secondary">
					Are you sure you want to delete this blog post? This action cannot be
					undone.
				</Text>
			</Modal>
		</motion.div>
	);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function BlogEditor({ editPostId }: BlogEditorProps) {
	if (editPostId) {
		return <EditBlogEditor id={editPostId} />;
	}
	return <CreateBlogEditor />;
}

BlogEditor.displayName = "BlogEditor";
