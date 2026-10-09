import { Button, EmptyState } from "@optimusfoundry/quiet";
import { FileText, Plus, SearchX } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";

export function BlogEmpty() {
	return (
		<EmptyState
			title={trimTrailingPeriod("No blog posts yet")}
			description="Create your first blog post to share long-form content."
			icon={<AppIcon icon={FileText} size="xl" />}
			actions={
				<Button
					variant="primary"
					size="sm"
					href="/blog/new"
					leftIcon={<AppIcon icon={Plus} size="md" />}
				>
					New Post
				</Button>
			}
		/>
	);
}

export function BlogEmptyFiltered({ onClear }: { onClear: () => void }) {
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
