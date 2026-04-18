import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Plus, SearchX } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useGetPosts } from "@/hooks/useGetPosts";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { FilterTabs } from "@/proto-design-system/components/data/FilterTabs";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { PostStatus } from "@/types/post";
import { getPlatformIcon } from "@/utils/platformIcons";
import pageStyles from "./page.module.scss";
import styles from "./posts.module.scss";

export const Route = createFileRoute("/posts")({
	component: PostsPage,
});

const FILTER_KEYS = [
	{ id: "", label: "All" },
	{ id: "draft", label: "Drafts" },
	{ id: "scheduled", label: "Scheduled" },
	{ id: "published", label: "Published" },
	{ id: "failed", label: "Needs retry" },
] as const;

const STATUS_CLASS: Record<PostStatus, string> = {
	draft: "statusDraft",
	scheduled: "statusScheduled",
	publishing: "statusPublishing",
	published: "statusPublished",
	failed: "statusFailed",
	partially_published: "statusPartial",
};

const STATUS_LABELS: Record<PostStatus, string> = {
	draft: "Draft",
	scheduled: "Scheduled",
	publishing: "Publishing",
	published: "Published",
	failed: "Failed",
	partially_published: "Partial",
};

function statusLine(post: {
	status: PostStatus;
	publishedAt?: string;
	scheduledAt?: string;
	createdAt: string;
}): string {
	const when = post.publishedAt ?? post.scheduledAt ?? post.createdAt;
	const ago = timeAgo(when);
	if (post.status === "published") return `Published · ${ago}`;
	if (post.status === "scheduled") return `Queued · ${ago}`;
	if (post.status === "failed") return `Failed · needs retry`;
	if (post.status === "publishing") return `Publishing · ${ago}`;
	if (post.status === "partially_published") return `Partial · ${ago}`;
	return `Draft · edited ${ago}`;
}

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

	const filters = useMemo(
		() => ({
			status: (statusFilter || undefined) as PostStatus | undefined,
		}),
		[statusFilter],
	);

	const { posts: allPosts } = useGetPosts();
	const { posts, loading, refetch } = useGetPosts(filters);
	const { deletePost, loading: deleting } = useDeletePost();
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

	const hasActiveFilter = statusFilter !== "";
	const postCount = allPosts.length;
	const publishedCount = allPosts.filter(
		(p) => p.status === "published",
	).length;
	const draftCount = allPosts.filter((p) => p.status === "draft").length;
	const scheduledCount = allPosts.filter(
		(p) => p.status === "scheduled",
	).length;
	const failedCount = allPosts.filter((p) => p.status === "failed").length;

	const filterItems = FILTER_KEYS.map((f) => ({
		id: f.id,
		label: f.label,
		count:
			f.id === ""
				? postCount
				: f.id === "draft"
					? draftCount
					: f.id === "scheduled"
						? scheduledCount
						: f.id === "published"
							? publishedCount
							: failedCount,
	}));

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
				<header className={pageStyles.pageHero}>
					<div className={pageStyles.pageHeroText}>
						<div className={pageStyles.pageEyebrow}>
							Library · {String(postCount).padStart(2, "0")}{" "}
							{postCount === 1 ? "entry" : "entries"}
						</div>
						<h1 className={pageStyles.pageHeroTitle}>
							Everything you've <em>written</em>, in one room.
						</h1>
						<p className={pageStyles.pageHeroSub}>
							Drafts, scheduled, and published — sorted the way your week
							actually works. Click through to edit in the composer.
						</p>
					</div>
				</header>

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

				<FilterTabs
					value={statusFilter}
					onChange={setStatusFilter}
					items={filterItems}
					aria-label="Filter posts by status"
				/>

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
								<Button variant="secondary" onClick={() => setStatusFilter("")}>
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
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2 }}
							className={styles.postList}
						>
							{posts.map((post, index) => (
								<Link
									key={post.id}
									to="/posts/$id"
									params={{ id: post.id }}
									className={styles.postLink}
								>
									<div className={styles.postRow}>
										<span className={styles.idx}>
											№ {String(index + 1).padStart(2, "0")}
										</span>
										<div className={styles.postBody}>
											<div className={styles.postTitleText}>
												{truncate(post.title || post.content, 80)}
											</div>
											<div className={styles.postMetaText}>
												{statusLine(post)}
											</div>
										</div>
										{post.platforms.length > 0 && (
											<span className={styles.platformChips}>
												{post.platforms.slice(0, 3).map((p) => (
													<span
														key={p}
														className={styles.platformChip}
														title={p}
													>
														{getPlatformIcon(p, 14)}
													</span>
												))}
											</span>
										)}
										<span
											className={`${styles.statusBadge} ${styles[STATUS_CLASS[post.status]]}`}
										>
											{STATUS_LABELS[post.status]}
										</span>
										<span className={styles.chevronBtn} aria-hidden>
											<ChevronRight size={16} />
										</span>
									</div>
								</Link>
							))}
						</motion.div>
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
