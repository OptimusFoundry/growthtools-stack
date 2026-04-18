import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Clock,
	FileText,
	Globe,
	List,
	Plus,
	RefreshCw,
	SearchX,
	Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useGetPosts } from "@/hooks/useGetPosts";
import { usePublishPost } from "@/hooks/usePublishPost";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Dropdown } from "@/proto-design-system/components/overlays/Dropdown";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { ContentType, PostStatus } from "@/types/post";
import { getPlatformIcon } from "@/utils/platformIcons";
import styles from "./posts.module.scss";

export const Route = createFileRoute("/posts")({
	component: PostsPage,
});

const STATUS_ITEMS = [
	{ id: "", label: "All Statuses" },
	{ id: "draft", label: "Draft" },
	{ id: "scheduled", label: "Scheduled" },
	{ id: "published", label: "Published" },
	{ id: "failed", label: "Failed" },
];

const CONTENT_TYPE_ITEMS = [
	{ id: "", label: "All Types" },
	{ id: "text", label: "Text" },
	{ id: "thread", label: "Thread" },
	{ id: "image", label: "Image" },
	{ id: "video", label: "Video" },
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
	partially_published: "warning",
};

const STATUS_LABELS: Record<PostStatus, string> = {
	draft: "Draft",
	scheduled: "Scheduled",
	publishing: "Publishing",
	published: "Published",
	failed: "Failed",
	partially_published: "Partial",
};

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(" ");
	return (
		(lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) +
		"..."
	);
}

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

	const { posts: allPosts } = useGetPosts();
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

	const hasActiveFilter = statusFilter !== "" || contentTypeFilter !== "";
	const postCount = allPosts.length;
	const publishedCount = allPosts.filter(
		(p) => p.status === "published",
	).length;
	const draftCount = allPosts.filter((p) => p.status === "draft").length;

	return (
		<>
			<Topbar
				title="Posts"
				actions={
					<Link to="/posts/new">
						<Button variant="primary">
							<Plus size={16} /> Create Post
						</Button>
					</Link>
				}
			/>
			<Stack gap="lg" className={styles.page} animate>
				<div className={styles.stats}>
					<div className={styles.statItem}>
						<Text size="2xl" weight="bold">
							{postCount}
						</Text>
						<Text size="xs" color="muted">
							Total
						</Text>
					</div>
					<div className={styles.statDivider} />
					<div className={styles.statItem}>
						<Text size="2xl" weight="bold">
							{publishedCount}
						</Text>
						<Text size="xs" color="muted">
							Published
						</Text>
					</div>
					<div className={styles.statDivider} />
					<div className={styles.statItem}>
						<Text size="2xl" weight="bold">
							{draftCount}
						</Text>
						<Text size="xs" color="muted">
							Drafts
						</Text>
					</div>
				</div>

				<div className={styles.filters}>
					<Dropdown
						items={STATUS_ITEMS}
						value={statusFilter}
						onChange={setStatusFilter}
						placeholder="Filter by status"
						size="sm"
						variant="outline"
					/>
					<Dropdown
						items={CONTENT_TYPE_ITEMS}
						value={contentTypeFilter}
						onChange={setContentTypeFilter}
						placeholder="Filter by type"
						size="sm"
						variant="outline"
					/>
				</div>

				<div className={styles.content}>
					{loading ? (
						<div className={styles.loadingState}>
							<Spinner />
						</div>
					) : posts.length === 0 && hasActiveFilter ? (
						<EmptyState
							title="No matching posts"
							description="Try adjusting your filters to find what you're looking for."
							icon={<SearchX size={48} />}
							action={
								<Button
									variant="secondary"
									onClick={() => {
										setStatusFilter("");
										setContentTypeFilter("");
									}}
								>
									Clear filters
								</Button>
							}
						/>
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
						<Stack gap="xs">
							{posts.map((post, index) => {
								const isThread = post.contentType === "thread";
								return (
									<motion.div
										key={post.id}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.2, delay: index * 0.03 }}
									>
										<Link
											to="/posts/$id"
											params={{ id: post.id }}
											className={styles.postLink}
										>
											<div className={styles.postCard}>
												<div className={styles.postCardLeft}>
													<div
														className={`${styles.postIcon} ${isThread ? styles.postIconThread : ""}`}
													>
														{isThread ? (
															<List size={16} />
														) : (
															<FileText size={16} />
														)}
													</div>
												</div>
												<div className={styles.postCardBody}>
													<div className={styles.postTitleRow}>
														<Text
															size="sm"
															weight="medium"
															className={styles.postTitle}
														>
															{truncate(post.title || post.content, 80)}
														</Text>
														<Badge
															variant={STATUS_BADGE_VARIANT[post.status]}
															size="sm"
														>
															{STATUS_LABELS[post.status]}
														</Badge>
													</div>
													{post.tags.length > 0 && (
														<div className={styles.postTags}>
															{post.tags.slice(0, 4).map((tag) => (
																<span key={tag} className={styles.tag}>
																	{tag}
																</span>
															))}
															{post.tags.length > 4 && (
																<span className={styles.tag}>
																	+{post.tags.length - 4}
																</span>
															)}
														</div>
													)}
													<div className={styles.postFooter}>
														<div className={styles.postMeta}>
															{post.platforms.length > 0 && (
																<span className={styles.platformIcons}>
																	{post.platforms.map((p) => (
																		<span
																			key={p}
																			className={styles.platformIcon}
																			title={p}
																		>
																			{getPlatformIcon(p, 14)}
																		</span>
																	))}
																</span>
															)}
															{post.publishedAt ? (
																<span className={styles.metaItem}>
																	<Globe size={12} />
																	Published {timeAgo(post.publishedAt)}
																</span>
															) : post.scheduledAt ? (
																<span className={styles.metaItem}>
																	<Clock size={12} />
																	Scheduled {timeAgo(post.scheduledAt)}
																</span>
															) : (
																<span className={styles.metaItem}>
																	<Clock size={12} />
																	{timeAgo(post.createdAt)}
																</span>
															)}
														</div>
														<div className={styles.postActions}>
															{post.status === "draft" && (
																<Button
																	variant="primary"
																	size="sm"
																	isIconOnly
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		handlePublish(post.id);
																	}}
																	isLoading={publishing}
																	aria-label="Publish post"
																>
																	<Globe size={14} />
																</Button>
															)}
															{post.status === "failed" && (
																<Button
																	variant="outline"
																	size="sm"
																	isIconOnly
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		handlePublish(post.id);
																	}}
																	isLoading={publishing}
																	aria-label="Retry publish"
																>
																	<RefreshCw size={14} />
																</Button>
															)}
															{post.status !== "published" &&
																post.status !== "partially_published" && (
																	<Button
																		variant="ghost"
																		size="sm"
																		isIconOnly
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			setDeleteTargetId(post.id);
																		}}
																		aria-label="Delete post"
																	>
																		<Trash2 size={14} />
																	</Button>
																)}
														</div>
													</div>
												</div>
											</div>
										</Link>
									</motion.div>
								);
							})}
						</Stack>
					)}
				</div>

				<Modal
					isOpen={deleteTargetId !== null}
					onClose={() => setDeleteTargetId(null)}
					title="Delete post"
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
					<Text color="secondary">
						Are you sure you want to delete this post? This action cannot be
						undone.
					</Text>
				</Modal>
			</Stack>
		</>
	);
}
