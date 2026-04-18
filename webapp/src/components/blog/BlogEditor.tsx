import { useNavigate } from "@tanstack/react-router";
import "highlight.js/styles/github.css";
import { BookOpen, Edit, Globe, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { useGetBlogPost } from "@/hooks/useGetBlogPost";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogPost } from "@/types/blog";
import { BlogWizard } from "./BlogWizard";
import styles from "./blog-editor.module.scss";

export interface BlogEditorProps {
	editPostId?: string;
}

// ── Create mode ──────────────────────────────────────────────────────────────

function CreateBlogEditor() {
	const navigate = useNavigate();
	return <BlogWizard onDone={() => navigate({ to: "/blog" })} />;
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

	if (fetching) return <Spinner />;
	if (fetchError) return <Alert variant="error">{fetchError}</Alert>;
	if (!blogPost) return <Alert variant="warning">Blog post not found.</Alert>;

	// ── Edit mode: full-width wizard ──────────────────────────────────────────
	if (isEditing) {
		return (
			<BlogWizard
				initialBlogPost={blogPost}
				onDone={() => {
					setIsEditing(false);
					refetch();
				}}
				onCancel={() => setIsEditing(false)}
			/>
		);
	}

	// ── View mode ─────────────────────────────────────────────────────────────
	return (
		<ViewBlogPage
			blogPost={blogPost}
			publishing={publishing}
			deleting={deleting}
			confirmDelete={confirmDelete}
			onEdit={() => setIsEditing(true)}
			onPublish={handlePublish}
			onRequestDelete={() => setConfirmDelete(true)}
			onCancelDelete={() => setConfirmDelete(false)}
			onDelete={handleDelete}
		/>
	);
}

// ── View-only page ────────────────────────────────────────────────────────────

interface ViewBlogPageProps {
	blogPost: BlogPost;
	publishing: boolean;
	deleting: boolean;
	confirmDelete: boolean;
	onEdit: () => void;
	onPublish: () => void;
	onRequestDelete: () => void;
	onCancelDelete: () => void;
	onDelete: () => void;
}

function ViewBlogPage({
	blogPost,
	publishing,
	deleting,
	confirmDelete,
	onEdit,
	onPublish,
	onRequestDelete,
	onCancelDelete,
	onDelete,
}: ViewBlogPageProps) {
	return (
		<motion.div
			className={styles.editor}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4 }}
		>
			<Breadcrumb
				size="lg"
				items={[
					{ label: "Blog", href: "/blog", icon: <BookOpen size={18} /> },
					{ label: blogPost.title },
				]}
			/>
			<Divider />
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
						<Button variant="secondary" onClick={onEdit}>
							<Edit size={16} /> Edit
						</Button>
						{blogPost.status !== "published" && (
							<Button
								variant="primary"
								onClick={onPublish}
								isLoading={publishing}
							>
								<Globe size={16} /> Publish
							</Button>
						)}
						<Button
							variant="ghost"
							onClick={onRequestDelete}
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
				onClose={onCancelDelete}
				title="Delete blog post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={onCancelDelete}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={onDelete}
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
