import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Globe, Plus, SearchX, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { usePublishBlog } from "@/hooks/usePublishBlog";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Dropdown } from "@/proto-design-system/components/overlays/Dropdown";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogStatus } from "@/types/blog";
import styles from "./blog.module.scss";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
});

const STATUS_ITEMS = [
	{ id: "", label: "All Statuses" },
	{ id: "draft", label: "Draft" },
	{ id: "published", label: "Published" },
	{ id: "archived", label: "Archived" },
];

const STATUS_BADGE_VARIANT: Record<
	BlogStatus,
	"default" | "success" | "secondary"
> = {
	draft: "default",
	published: "success",
	archived: "secondary",
};

const STATUS_LABELS: Record<BlogStatus, string> = {
	draft: "Draft",
	published: "Published",
	archived: "Archived",
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

function BlogPage() {
	const [statusFilter, setStatusFilter] = useState<string>("");

	const filters = useMemo(
		() => ({
			status: (statusFilter || undefined) as BlogStatus | undefined,
		}),
		[statusFilter],
	);

	const { blogPosts: allPosts } = useBlogPosts();
	const { blogPosts, loading, refetch } = useBlogPosts(filters);
	const { deleteBlog, loading: deleting } = useDeleteBlog();
	const { publishBlog, loading: publishing } = usePublishBlog();
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteTargetId) return;
		try {
			await deleteBlog(deleteTargetId);
			setDeleteTargetId(null);
			refetch();
		} catch {
			// error surfaced via hook state
		}
	}, [deleteTargetId, deleteBlog, refetch]);

	const handlePublish = async (id: string) => {
		try {
			await publishBlog(id);
			refetch();
		} catch {
			// error surfaced via hook state
		}
	};

	const hasActiveFilter = statusFilter !== "";
	const postCount = allPosts.length;
	const publishedCount = allPosts.filter(
		(p) => p.status === "published",
	).length;
	const draftCount = allPosts.filter((p) => p.status === "draft").length;

	return (
		<>
			<Topbar
				title="Blog"
				actions={
					<Link to="/blog/new">
						<Button variant="primary">
							<Plus size={16} /> New Post
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
				</div>

				<div className={styles.content}>
					{loading ? (
						<div className={styles.loadingState}>
							<Spinner />
						</div>
					) : blogPosts.length === 0 && hasActiveFilter ? (
						<EmptyState
							title="No matching posts"
							description="Try adjusting your filters to find what you're looking for."
							icon={<SearchX size={48} />}
							action={
								<Button variant="secondary" onClick={() => setStatusFilter("")}>
									Clear filters
								</Button>
							}
						/>
					) : blogPosts.length === 0 ? (
						<EmptyState
							title="No blog posts yet"
							description="Create your first blog post to share long-form content."
							icon={<FileText size={48} />}
							action={
								<Link to="/blog/new">
									<Button variant="primary">
										<Plus size={16} /> New Post
									</Button>
								</Link>
							}
						/>
					) : (
						<Stack gap="xs">
							{blogPosts.map((post, index) => (
								<motion.div
									key={post.id}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: index * 0.03 }}
								>
									<Link
										to="/blog/$id"
										params={{ id: post.id }}
										className={styles.postLink}
									>
										<div className={styles.postCard}>
											<div className={styles.postCardLeft}>
												<div className={styles.postIcon}>
													<FileText size={16} />
												</div>
											</div>
											<div className={styles.postCardBody}>
												<div className={styles.postTitleRow}>
													<Text
														size="sm"
														weight="medium"
														className={styles.postTitle}
													>
														{truncate(post.title, 80)}
													</Text>
													<Badge
														variant={STATUS_BADGE_VARIANT[post.status]}
														size="sm"
													>
														{STATUS_LABELS[post.status]}
													</Badge>
												</div>
												{post.excerpt && (
													<Text size="xs" color="muted">
														{truncate(post.excerpt, 160)}
													</Text>
												)}
												{post.keywords.length > 0 && (
													<div className={styles.postTags}>
														{post.keywords.slice(0, 4).map((kw) => (
															<span key={kw} className={styles.tag}>
																{kw}
															</span>
														))}
														{post.keywords.length > 4 && (
															<span className={styles.tag}>
																+{post.keywords.length - 4}
															</span>
														)}
													</div>
												)}
												<div className={styles.postFooter}>
													<div className={styles.postMeta}>
														<span className={styles.metaItem}>
															{post.publishedAt
																? `Published ${timeAgo(post.publishedAt)}`
																: timeAgo(post.createdAt)}
														</span>
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
																aria-label="Publish blog post"
															>
																<Globe size={14} />
															</Button>
														)}
														{post.status !== "published" && (
															<Button
																variant="ghost"
																size="sm"
																isIconOnly
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	setDeleteTargetId(post.id);
																}}
																aria-label="Delete blog post"
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
							))}
						</Stack>
					)}
				</div>

				<Modal
					isOpen={deleteTargetId !== null}
					onClose={() => setDeleteTargetId(null)}
					title="Delete blog post"
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
						Are you sure you want to delete this blog post? This action cannot
						be undone.
					</Text>
				</Modal>
			</Stack>
		</>
	);
}
