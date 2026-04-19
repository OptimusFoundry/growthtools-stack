import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Plus, SearchX, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { FilterTabs } from "@/proto-design-system/components/data/FilterTabs";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { BlogStatus } from "@/types/blog";
import styles from "./blog.module.scss";
import pageStyles from "./page.module.scss";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
});

const FILTER_KEYS = [
	{ id: "", label: "All" },
	{ id: "draft", label: "Drafts" },
	{ id: "published", label: "Published" },
	{ id: "archived", label: "Archived" },
] as const;

const STATUS_CLASS: Record<BlogStatus, string> = {
	draft: "statusDraft",
	published: "statusPublished",
	archived: "statusArchived",
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
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const { addBanner } = useBannerCenter();

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteTargetId) return;
		try {
			await deleteBlog(deleteTargetId);
			setDeleteTargetId(null);
			addBanner({
				type: "success",
				title: "Blog post deleted",
				dismissible: true,
			});
			refetch();
		} catch {
			addBanner({
				type: "error",
				title: "Couldn't delete blog post",
				description: "Please try again.",
				dismissible: true,
			});
		}
	}, [deleteTargetId, deleteBlog, refetch, addBanner]);

	const hasActiveFilter = statusFilter !== "";
	const postCount = allPosts.length;
	const publishedCount = allPosts.filter(
		(p) => p.status === "published",
	).length;
	const draftCount = allPosts.filter((p) => p.status === "draft").length;
	const archivedCount = allPosts.filter((p) => p.status === "archived").length;

	const filterItems = FILTER_KEYS.map((f) => ({
		id: f.id,
		label: f.label,
		count:
			f.id === ""
				? postCount
				: f.id === "draft"
					? draftCount
					: f.id === "published"
						? publishedCount
						: archivedCount,
	}));

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
				<header className={pageStyles.pageHero}>
					<div className={pageStyles.pageHeroText}>
						<div className={pageStyles.pageEyebrow}>
							Stories · {String(postCount).padStart(2, "0")}{" "}
							{postCount === 1 ? "piece" : "pieces"}
						</div>
						<h1 className={pageStyles.pageHeroTitle}>
							Long-form, <em>thought through</em>.
						</h1>
						<p className={pageStyles.pageHeroSub}>
							Drafts to refine and stories to ship. Write the slow takes here —
							quick threads belong in Posts.
						</p>
					</div>
				</header>

				<FilterTabs
					value={statusFilter}
					onChange={setStatusFilter}
					items={filterItems}
					aria-label="Filter blog posts by status"
				/>

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
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2 }}
							className={styles.postList}
						>
							{blogPosts.map((post, index) => (
								<Link
									key={post.id}
									to="/blog/$id"
									params={{ id: post.id }}
									className={styles.postLink}
								>
									<div className={styles.postRow}>
										<div className={styles.titleRow}>
											<span className={styles.idx}>
												№ {String(index + 1).padStart(2, "0")}
											</span>
											<div className={styles.postBody}>
												<div className={styles.postTitleText}>
													{truncate(post.title, 80)}
												</div>
												<div className={styles.postMetaText}>
													{post.publishedAt
														? `Published · ${timeAgo(post.publishedAt)}`
														: `Draft · edited ${timeAgo(post.createdAt)}`}
												</div>
											</div>
										</div>
										<div className={styles.metaRow}>
											<span
												className={`${styles.statusBadge} ${styles[STATUS_CLASS[post.status]]}`}
											>
												{STATUS_LABELS[post.status]}
											</span>
											{post.status === "draft" && (
												<button
													type="button"
													className={styles.deleteBtn}
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setDeleteTargetId(post.id);
													}}
													aria-label="Delete"
												>
													<Trash2 size={16} />
												</button>
											)}
											<span className={styles.chevronBtn} aria-hidden>
												<ChevronRight size={16} />
											</span>
										</div>
									</div>
								</Link>
							))}
						</motion.div>
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
