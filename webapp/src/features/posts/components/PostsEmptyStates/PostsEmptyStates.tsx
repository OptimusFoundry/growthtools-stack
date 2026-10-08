import { Link } from "@tanstack/react-router";
import { FileText, Plus, SearchX } from "lucide-react";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState/EmptyState";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";

export function PostsEmpty() {
	return (
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
	);
}

export function PostsEmptyFiltered({ onClear }: { onClear: () => void }) {
	return (
		<EmptyState
			title="No matching posts"
			description="Try adjusting your filters to find what you're looking for."
			icon={<SearchX size={48} />}
			action={
				<Button variant="secondary" onClick={onClear}>
					Clear filters
				</Button>
			}
		/>
	);
}
