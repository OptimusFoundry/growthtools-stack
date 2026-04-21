import { Link } from "@tanstack/react-router";
import { FileText, Plus, SearchX } from "lucide-react";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Button } from "@/proto-design-system/components/primitives/Button";

export function BlogEmpty() {
	return (
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
	);
}

export function BlogEmptyFiltered({ onClear }: { onClear: () => void }) {
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
