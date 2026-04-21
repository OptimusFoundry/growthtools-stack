import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDeleteModal } from "@/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal";
import { ResourceListPage } from "@/components/patterns/ResourceListPage/ResourceListPage";
import { PostRow } from "@/features/posts/components/PostRow/PostRow";
import {
	PostsEmpty,
	PostsEmptyFiltered,
} from "@/features/posts/components/PostsEmptyStates/PostsEmptyStates";
import { PostsHero } from "@/features/posts/components/PostsHero/PostsHero";
import { useConfirmableDelete } from "@/hooks/useConfirmableDelete";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useFilterCounts } from "@/hooks/useFilterCounts";
import { useGetPosts } from "@/hooks/useGetPosts";
import { FilterTabs } from "@/proto-design-system/components/data/FilterTabs";
import { Button } from "@/proto-design-system/components/primitives/Button";
import type { PostStatus } from "@/types/post";

export const Route = createFileRoute("/posts")({
	component: PostsPage,
});

const FILTER_KEYS = [
	{ id: "", label: "All" },
	{ id: "draft", label: "Drafts" },
	{ id: "scheduled", label: "Scheduled" },
	{ id: "published", label: "Published" },
	{ id: "failed", label: "Needs retry" },
] as const satisfies readonly {
	id: "" | PostStatus;
	label: string;
}[];

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

	const deleteFlow = useConfirmableDelete({
		mutate: deletePost,
		mutating: deleting,
		onSuccess: refetch,
		copy: {
			resource: "post",
			modalTitle: "Delete post",
			confirmBody:
				"Are you sure you want to delete this post? This action cannot be undone.",
		},
	});

	const filterItems = useFilterCounts(allPosts, FILTER_KEYS, (p) => p.status);

	return (
		<ResourceListPage
			title="Posts"
			topbarAction={
				<Link to="/posts/new">
					<Button variant="primary">
						<Plus size={16} /> Create Post
					</Button>
				</Link>
			}
			hero={<PostsHero count={allPosts.length} />}
			filters={
				<FilterTabs
					value={statusFilter}
					onChange={setStatusFilter}
					items={filterItems}
					aria-label="Filter posts by status"
				/>
			}
			loading={loading}
			items={posts}
			hasActiveFilter={statusFilter !== ""}
			empty={<PostsEmpty />}
			emptyFiltered={<PostsEmptyFiltered onClear={() => setStatusFilter("")} />}
			renderItem={(post, i) => (
				<PostRow
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
