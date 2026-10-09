import { Button, EmptyState } from "@optimusfoundry/quiet";
import { FileText, Plus, SearchX } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";

export function PostsEmpty() {
	return (
		<EmptyState
			title={trimTrailingPeriod("No posts yet")}
			description="Create your first post to get started."
			icon={<AppIcon icon={FileText} size="xl" />}
			actions={
				<Button
					variant="primary"
					size="sm"
					href="/posts/new"
					leftIcon={<AppIcon icon={Plus} />}
				>
					Create Post
				</Button>
			}
		/>
	);
}

export function PostsEmptyFiltered({ onClear }: { onClear: () => void }) {
	return (
		<EmptyState
			title={trimTrailingPeriod("No matching posts")}
			description="Try adjusting your filters to find what you're looking for."
			icon={<AppIcon icon={SearchX} size="xl" />}
			actions={
				<Button variant="secondary" size="sm" onClick={onClear}>
					Clear filters
				</Button>
			}
		/>
	);
}
