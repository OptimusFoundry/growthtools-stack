import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDeleteModal } from "@/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal";
import { ResourceListPage } from "@/components/patterns/ResourceListPage/ResourceListPage";
import {
	BlogEmpty,
	BlogEmptyFiltered,
} from "@/features/blog/components/BlogEmptyStates/BlogEmptyStates";
import { BlogHero } from "@/features/blog/components/BlogHero/BlogHero";
import { BlogRow } from "@/features/blog/components/BlogRow/BlogRow";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { useConfirmableDelete } from "@/hooks/useConfirmableDelete";
import { useDeleteBlog } from "@/hooks/useDeleteBlog";
import { useFilterCounts } from "@/hooks/useFilterCounts";
import { FilterTabs } from "@/proto-design-system/components/data/FilterTabs";
import { Button } from "@/proto-design-system/components/primitives/Button";
import type { BlogStatus, DeleteBlogResult } from "@/types/blog";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
});

const FILTER_KEYS = [
	{ id: "", label: "All" },
	{ id: "draft", label: "Drafts" },
	{ id: "published", label: "Published" },
	{ id: "archived", label: "Archived" },
] as const satisfies readonly {
	id: "" | BlogStatus;
	label: string;
}[];

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

	const deleteFlow = useConfirmableDelete<DeleteBlogResult>({
		mutate: deleteBlog,
		mutating: deleting,
		onSuccess: refetch,
		getWarning: (result) => result.siteDeleteError,
		copy: {
			resource: "blog post",
			modalTitle: "Delete blog post",
			confirmBody: (targetId: string) => {
				const target = blogPosts.find((p) => p.id === targetId);
				return target?.sitePrUrl
					? "This post is live on shubhanshu.dev — deleting it will also open a PR to remove it from the site."
					: "Are you sure you want to delete this blog post? This action cannot be undone.";
			},
		},
	});

	const filterItems = useFilterCounts(allPosts, FILTER_KEYS, (p) => p.status);

	return (
		<ResourceListPage
			title="Blog"
			topbarAction={
				<Link to="/blog/new">
					<Button variant="primary">
						<Plus size={16} /> New Post
					</Button>
				</Link>
			}
			hero={<BlogHero count={allPosts.length} />}
			filters={
				<FilterTabs
					value={statusFilter}
					onChange={setStatusFilter}
					items={filterItems}
					aria-label="Filter blog posts by status"
				/>
			}
			loading={loading}
			items={blogPosts}
			hasActiveFilter={statusFilter !== ""}
			empty={<BlogEmpty />}
			emptyFiltered={<BlogEmptyFiltered onClear={() => setStatusFilter("")} />}
			renderItem={(post, i) => (
				<BlogRow
					key={post.id}
					post={post}
					index={i}
					onDelete={deleteFlow.request}
				/>
			)}
			overlays={<ConfirmDeleteModal flow={deleteFlow} />}
		/>
	);
}
