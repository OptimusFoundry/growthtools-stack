import { Button, FilterTabs, Stack } from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { ConfirmDeleteModal } from "@/components/patterns/ConfirmDeleteModal/ConfirmDeleteModal";
import { ResourceListPage } from "@/components/patterns/ResourceListPage/ResourceListPage";
import { CreateShowcasePostModal } from "@/components/showcase-post/CreateShowcasePostModal";
import { SHOWCASE_POST_COPY } from "@/components/showcase-post/copy";
import { useCreateShowcasePostFlow } from "@/components/showcase-post/useCreateShowcasePostFlow";
import { PostRow } from "@/features/posts/components/PostRow/PostRow";
import {
	PostsEmpty,
	PostsEmptyFiltered,
} from "@/features/posts/components/PostsEmptyStates/PostsEmptyStates";
import { PostsHero } from "@/features/posts/components/PostsHero/PostsHero";
import { useConfirmableDelete } from "@/hooks/useConfirmableDelete";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toFilterTabItems, useFilterCounts } from "@/hooks/useFilterCounts";
import { useGetPosts } from "@/hooks/useGetPosts";
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
	useDocumentTitle("Posts");
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
	const showcaseFlow = useCreateShowcasePostFlow();

	return (
		<ResourceListPage
			title="Posts"
			topbarAction={
				<Stack direction="row" gap="xs">
					<Button
						variant="primary"
						size="sm"
						href="/posts/new"
						leftIcon={<AppIcon icon={Plus} size="md" />}
					>
						Create Post
					</Button>
					<Button variant="secondary" size="sm" onClick={showcaseFlow.open}>
						{SHOWCASE_POST_COPY.triggerLabel}
					</Button>
				</Stack>
			}
			hero={<PostsHero count={allPosts.length} />}
			filters={
				<FilterTabs
					size="sm"
					label="Filter posts by status"
					items={toFilterTabItems(filterItems)}
					value={statusFilter}
					onChange={setStatusFilter}
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
			overlays={
				<>
					<ConfirmDeleteModal flow={deleteFlow} />
					<CreateShowcasePostModal flow={showcaseFlow} />
				</>
			}
		/>
	);
}
