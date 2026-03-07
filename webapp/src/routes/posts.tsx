import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useGetPosts } from "@/hooks/useGetPosts";
import { usePublishPost } from "@/hooks/usePublishPost";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Select } from "@/proto-design-system/components/forms/Select";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import type { ContentType, PostStatus } from "@/types/post";
import styles from "./page.module.scss";

export const Route = createFileRoute("/posts")({
	component: PostsPage,
});

const STATUS_OPTIONS = [
	{ value: "", label: "All Statuses" },
	{ value: "draft", label: "Draft" },
	{ value: "scheduled", label: "Scheduled" },
	{ value: "published", label: "Published" },
	{ value: "failed", label: "Failed" },
];

const CONTENT_TYPE_OPTIONS = [
	{ value: "", label: "All Types" },
	{ value: "text", label: "Text" },
	{ value: "image", label: "Image" },
	{ value: "video", label: "Video" },
	{ value: "carousel", label: "Carousel" },
	{ value: "thread", label: "Thread" },
];

const STATUS_BADGE_VARIANT: Record<
	PostStatus,
	"success" | "warning" | "error" | "default" | "primary"
> = {
	draft: "default",
	scheduled: "warning",
	publishing: "primary",
	published: "success",
	failed: "error",
};

function PostsPage() {
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [contentTypeFilter, setContentTypeFilter] = useState<string>("");

	const filters = useMemo(
		() => ({
			status: (statusFilter || undefined) as PostStatus | undefined,
			contentType: (contentTypeFilter || undefined) as ContentType | undefined,
		}),
		[statusFilter, contentTypeFilter],
	);

	const { posts, loading, refetch } = useGetPosts(filters);
	const { deletePost, loading: deleting } = useDeletePost();
	const { publishPost, loading: publishing } = usePublishPost();
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteTargetId) return;
		try {
			await deletePost(deleteTargetId);
			setDeleteTargetId(null);
			refetch();
		} catch {
			// error is surfaced via hook state
		}
	}, [deleteTargetId, deletePost, refetch]);

	const handlePublish = async (id: string) => {
		try {
			await publishPost(id, []);
			refetch();
		} catch {
			// error is surfaced via hook state
		}
	};

	return (
		<motion.div
			className={styles.page}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<Stack direction="row" justify="between" align="center">
				<div className={styles.pageHeader}>
					<h1 className={styles.pageTitle}>Posts</h1>
					<p className={styles.pageDescription}>
						Create, manage, and publish your social media posts
					</p>
				</div>
				<Link to="/posts/new">
					<Button variant="primary">
						<Plus size={16} /> Create Post
					</Button>
				</Link>
			</Stack>

			<Stack direction="row" gap="sm">
				<Select
					options={STATUS_OPTIONS}
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					placeholder="Filter by status"
				/>
				<Select
					options={CONTENT_TYPE_OPTIONS}
					value={contentTypeFilter}
					onChange={(e) => setContentTypeFilter(e.target.value)}
					placeholder="Filter by type"
				/>
			</Stack>

			<div className={styles.pageContent}>
				{loading ? (
					<Spinner />
				) : posts.length === 0 ? (
					<EmptyState
						title="No posts yet"
						description="Create your first post to get started."
						icon={<FileText size={48} />}
						action={
							<Link to="/posts/new">
								<Button variant="primary">
									<Plus size={16} /> Create Post
								</Button>
							</Link>
						}
					/>
				) : (
					<Stack gap="sm">
						{posts.map((post) => (
							<Link key={post.id} to="/posts/$id" params={{ id: post.id }}>
								<Card padding="md" interactive>
									<Stack direction="row" justify="between" align="center">
										<Stack gap="xs">
											<Stack direction="row" gap="xs" align="center">
												<strong>
													{post.title || post.content.slice(0, 60)}
												</strong>
												<Badge variant={STATUS_BADGE_VARIANT[post.status]}>
													{post.status}
												</Badge>
											</Stack>
											<Stack direction="row" gap="xs" align="center" wrap>
												{post.tags.map((tag) => (
													<Badge key={tag} variant="outline" size="sm">
														{tag}
													</Badge>
												))}
											</Stack>
											<span>
												{new Date(post.createdAt).toLocaleDateString()}
											</span>
										</Stack>
										<Stack direction="row" gap="xs">
											{post.status === "draft" && (
												<Button
													variant="primary"
													size="sm"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														handlePublish(post.id);
													}}
													isLoading={publishing}
												>
													Publish
												</Button>
											)}
											<Button
												variant="destructive"
												size="sm"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													setDeleteTargetId(post.id);
												}}
												aria-label="Delete post"
											>
												<Trash2 size={14} />
											</Button>
										</Stack>
									</Stack>
								</Card>
							</Link>
						))}
					</Stack>
				)}
			</div>
			<Modal
				isOpen={deleteTargetId !== null}
				onClose={() => setDeleteTargetId(null)}
				title="Delete post"
				description="Are you sure you want to delete this post? This action cannot be undone."
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				{null}
			</Modal>
		</motion.div>
	);
}
